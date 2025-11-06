import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/qr-scan?session_id=uuid&email=user@nyu.edu
 */
router.get('/qr-scan', async (req: Request, res: Response) => {
  const { session_id, email } = req.query;

  if (!session_id || !email)
    return res.status(400).json({ error: 'Missing session_id or email' });

  try {
    // 1️⃣ 세션 확인
    const { data: session, error: sessionError } = await supabase
      .from('Attendance_Session')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Invalid or expired QR code' });
    }

    // 2️⃣ 멤버 찾기
    const { data: member, error: memberError } = await supabase
      .from('Members')
      .select('member_id, korean_name')
      .eq('school_email', email)
      .single();

    if (memberError || !member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // 3️⃣ Attendance 저장
    const { error: attendanceError } = await supabase
      .from('Attendance')
      .insert([
        {
          member_id: member.member_id,
          session_id,
          date: session.date,
        },
      ]);
    if (attendanceError) throw attendanceError;

    // 4️⃣ 출석 완료 페이지로 리다이렉트
    res.redirect(
      `/attendance-success?name=${encodeURIComponent(member.korean_name)}`
    );
  } catch (err: any) {
    console.error('[qr-scan] error:', err.message);
    res.status(500).send('Failed to record attendance');
  }
});

export default router;
