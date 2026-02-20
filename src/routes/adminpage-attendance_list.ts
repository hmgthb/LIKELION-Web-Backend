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

      // 2) 대상 meeting_number 목록 만들기
      let meetingNumbers: number[] = [];

      if (meetingNum) {
        meetingNumbers = [meetingNum];
      } else {
        // Attendance_Session 기준으로 전체 미팅 목록 추출 (중복 제거)
        const { data: sessions, error: sessErr } = await supabase
          .from('Attendance_Session')
          .select('meeting_number')
          .order('meeting_number', { ascending: false });

        if (sessErr) throw sessErr;

        meetingNumbers = Array.from(
          new Set((sessions || []).map((s: any) => Number(s.meeting_number))),
        );

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

export default router;
