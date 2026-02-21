import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/adminpage/attendance_list
 * GET /api/adminpage/attendance_list?meeting_number=322
 *
 * - is_active=true 멤버 기준
 * - meeting_number 없으면: 모든 미팅에 대해 평면 리스트로 반환
 * - Attendance row 없으면 Absent
 */
router.get(
  '/adminpage/attendance_list',
  async (req: Request, res: Response) => {
    try {
      const meetingNumberParam = req.query.meeting_number;
      const meetingNum =
        meetingNumberParam !== undefined ? Number(meetingNumberParam) : null;

      if (meetingNumberParam !== undefined) {
        if (!Number.isFinite(meetingNum)) {
          return res.status(400).json({ error: 'Invalid meeting_number' });
        }
      }

      // 1) 활성 멤버
      const { data: members, error: memErr } = await supabase
        .from('Members')
        .select('member_id, korean_name, english_name')
        .eq('is_active', true);

      if (memErr) throw memErr;

      if (!members || members.length === 0) {
        return res.status(200).json({ attendance: [] });
      }

      // 2) 대상 meeting_number 목록 + 날짜 맵 만들기
      let meetingNumbers: number[] = [];
      const dateMap = new Map<number, string>();

      const formatDate = (isoString: string): string => {
        const d = new Date(isoString);
        // 뉴욕 시간 기준 년/월/일
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });
        return formatter.format(d); // e.g., "2/21/2026"
      };

      if (meetingNum) {
        meetingNumbers = [meetingNum];
        // 해당 미팅의 날짜 조회
        const { data: sessions } = await supabase
          .from('Attendance_Session')
          .select('meeting_number, created_at')
          .eq('meeting_number', meetingNum)
          .order('created_at', { ascending: true })
          .limit(1);
        if (sessions && sessions.length > 0) {
          dateMap.set(meetingNum, formatDate(sessions[0].created_at));
        }
      } else {
        // Attendance_Session 기준으로 전체 미팅 목록 + 날짜 추출
        const { data: sessions, error: sessErr } = await supabase
          .from('Attendance_Session')
          .select('meeting_number, created_at')
          .order('meeting_number', { ascending: false });

        if (sessErr) throw sessErr;

        const seenMeetings = new Set<number>();
        (sessions || []).forEach((s: any) => {
          const mn = Number(s.meeting_number);
          if (!seenMeetings.has(mn)) {
            seenMeetings.add(mn);
            dateMap.set(mn, formatDate(s.created_at));
          }
        });
        meetingNumbers = Array.from(seenMeetings);

        // 세션이 없다면 Attendance에서라도 찾기
        if (meetingNumbers.length === 0) {
          const { data: attMeetings, error: attMeetErr } = await supabase
            .from('Attendance')
            .select('meeting_number')
            .order('meeting_number', { ascending: false });

          if (attMeetErr) throw attMeetErr;

          meetingNumbers = Array.from(
            new Set(
              (attMeetings || []).map((a: any) => Number(a.meeting_number)),
            ),
          );
        }

        if (meetingNumbers.length === 0) {
          return res.status(200).json({ attendance: [] });
        }
      }

      // 3) Attendance 한 번에 가져오기 (IN)
      const { data: attendanceRows, error: attErr } = await supabase
        .from('Attendance')
        .select('member_id, meeting_number, status')
        .in('meeting_number', meetingNumbers);

      if (attErr) throw attErr;

      // 4) (meeting_number, member_id) -> status 맵
      const statusMap = new Map<string, string>();
      (attendanceRows || []).forEach((row: any) => {
        statusMap.set(
          `${row.meeting_number}:${row.member_id}`,
          row.status || 'Present',
        );
      });

      // 5) 평면 리스트 생성: meeting_number * members 전원
      // meeting_number 내림차순이 먼저, 그 안에서 member_id 오름차순(원하면 바꿔도 됨)
      const attendance = meetingNumbers
        .sort((a, b) => b - a)
        .flatMap((mn) =>
          members
            .slice()
            .sort((a: any, b: any) => a.member_id - b.member_id)
            .map((m: any) => ({
              meeting_number: mn,
              date: dateMap.get(mn) ?? null,
              member_id: m.member_id,
              korean_name: m.korean_name,
              english_name: m.english_name,
              status: statusMap.get(`${mn}:${m.member_id}`) ?? 'Absent',
            })),
        );

      return res.status(200).json({ attendance });
    } catch (err: any) {
      console.error('[adminpage/attendance_list] error:', err.message || err);
      return res.status(500).json({ error: 'Failed to fetch attendance list' });
    }
  },
);

/**
 * POST /api/adminpage/attendance_status
 * Body: { member_id: number, meeting_number: number, status: 'Present' | 'Late' | 'Absent' }
 */
router.post(
  '/adminpage/attendance_status',
  async (req: Request, res: Response) => {
    try {
      const { member_id, meeting_number, status } = req.body;

      if (!member_id || !meeting_number || !status) {
        return res
          .status(400)
          .json({ error: 'member_id, meeting_number, status are required' });
      }

      const validStatuses = ['Present', 'Late', 'Absent'];
      if (!validStatuses.includes(status)) {
        return res
          .status(400)
          .json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      // 기존 row 업데이트 시도
      const { data: updated, error: updateError } = await supabase
        .from('Attendance')
        .update({ status })
        .eq('member_id', member_id)
        .eq('meeting_number', meeting_number)
        .select('member_id');

      if (updateError) throw updateError;

      // 업데이트된 row가 없으면 insert
      if (!updated || updated.length === 0) {
        const { error: insertError } = await supabase
          .from('Attendance')
          .insert({ member_id, meeting_number, status });

        if (insertError) throw insertError;
      }

      return res.status(200).json({ success: true, member_id, meeting_number, status });
    } catch (err: any) {
      console.error('[adminpage/attendance_status] error:', err.message || err);
      return res.status(500).json({ error: 'Failed to update attendance status' });
    }
  },
);

export default router;
