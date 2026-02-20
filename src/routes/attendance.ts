import { Router, Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/attendance/checkin
 * Body: { school_email, password, meeting_number }
 * - meeting_number로 Attendance_Session(가장 최근) 찾아서 Present/Late 판정
 * - Attendance에 기록 + 결과 반환
 */
router.post('/attendance', async (req: Request, res: Response) => {
  const { school_email, password, meeting_number } = req.body;

  // meeting_number는 0/NaN 방지 위해 이렇게 검사
  if (
    !school_email ||
    !password ||
    meeting_number === undefined ||
    meeting_number === null
  ) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const meetingNum = Number(meeting_number);
  if (!Number.isFinite(meetingNum) || meetingNum <= 0) {
    return res.status(400).json({ error: 'Invalid meeting_number' });
  }

  try {
    // 1) Firebase 로그인
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    await axios.post(firebaseAuthUrl, {
      email: school_email,
      password,
      returnSecureToken: true,
    });

    // 2) 멤버 조회
    const { data: users, error: userError } = await supabase
      .from('Members')
      .select('member_id, school_email, korean_name, english_name')
      .eq('school_email', school_email)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    const user = users[0];

    // 3) 세션 조회: meeting_number의 "가장 최근" 세션 1개
    const { data: sessions, error: sessionError } = await supabase
      .from('Attendance_Session')
      .select('qr_id, created_at, expires_at, meeting_number')
      .eq('meeting_number', meetingNum)
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessionError || !sessions || sessions.length === 0) {
      return res
        .status(404)
        .json({ error: 'No active session for this meeting_number' });
    }

    const session = sessions[0];

    // 4) Present / Late 판정
    const now = new Date();
    const expiresAt = new Date(session.expires_at);

    const status = now <= expiresAt ? 'Present' : 'Late';

    // 5) Attendance 기록
    // (권장) 중복 방지: Attendance 테이블에 UNIQUE(meeting_number, member_id) 걸어두기
    const { data: attendance, error: attendanceError } = await supabase
      .from('Attendance')
      .insert([
        {
          member_id: user.member_id,
          meeting_number: meetingNum,
          status, // Attendance에 status 컬럼이 있어야 함
        },
      ])
      .select()
      .single();

    if (attendanceError) {
      return res
        .status(409)
        .json({ error: 'Already checked in for this meeting' });
    }

    // 6) NY 타임 문자열
    const checkedAtNy = new Date(attendance.timestamp || now).toLocaleString(
      'en-US',
      { timeZone: 'America/New_York' },
    );

    return res.status(200).json({
      meeting_number: meetingNum,
      name: user.korean_name || user.english_name || user.school_email,
      status,
      checked_at_ny: checkedAtNy,
      // 디버깅용: 어떤 세션으로 판정했는지 같이 내려주기(원하면 제거)
      session: {
        created_at: session.created_at,
        expires_at: session.expires_at,
      },
    });
  } catch (err: any) {
    const firebaseError = err.response?.data?.error?.message;

    if (
      firebaseError === 'EMAIL_NOT_FOUND' ||
      firebaseError === 'INVALID_PASSWORD'
    ) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (firebaseError === 'PASSWORD_LOGIN_DISABLED') {
      return res
        .status(403)
        .json({ error: 'Email/password sign-in is disabled in Firebase.' });
    }

    console.error(
      '[attendance/checkin] error:',
      err.response?.data || err.message,
    );
    return res.status(500).json({ error: 'Failed to check in' });
  }
});

export default router;
