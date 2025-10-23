import { Router, Request, Response } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/attendance
 * Body: { school_email, password }
 */
router.post('/attendance', async (req: Request, res: Response) => {
  const { school_email, password } = req.body;

  if (!school_email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    // ✅ 1️⃣ Firebase REST API로 로그인 시도
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    const response = await axios.post<{ idToken: string; localId: string }>(
      firebaseAuthUrl,
      {
        email: school_email,
        password,
        returnSecureToken: true,
      }
    );

    // 로그인 성공 시, Firebase 계정 정보 확인
    const { localId } = response.data;

    // ✅ 2️⃣ Supabase에서 해당 멤버 찾기
    const { data: users, error: userError } = await supabase
      .from('Members')
      .select('member_id, school_email, korean_name, english_name')
      .eq('school_email', school_email);

    if (userError || !users || users.length === 0) {
      throw new Error('Member not found in Supabase.');
    }

    const user = users[0];

    // ✅ 3️⃣ Attendance 테이블에 출석 기록 추가
    // timestamp는 Supabase에서 자동으로 now()로 채워짐
    const { data: attendance, error: attendanceError } = await supabase
      .from('Attendance')
      .insert([{ member_id: user.member_id }]) // 👈 필수 컬럼만 삽입
      .select()
      .single();

    if (attendanceError) throw attendanceError;

    // ✅ 🔥 뉴욕 시간으로 변환
    const nyTime = new Date(attendance.timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',
    });

    // ✅ 4️⃣ 성공 응답
    res.status(200).json({
      message: 'Attendance recorded successfully',
      member: user,
      attendance: {
        ...attendance,
        ny_timestamp: nyTime, // ✅ 뉴욕 시간 추가
      },
    });
  } catch (err: any) {
    console.error('[attendance] error:', err.response?.data || err.message);

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

    res
      .status(500)
      .json({ error: err.message || 'Failed to record attendance' });
  }
});

export default router;
