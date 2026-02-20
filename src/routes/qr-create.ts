import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/qr-create?meeting_number=${meeting_number}
 * - Attendance_Session에 세션 생성
 * - expires_at = created_at + 10분
 * - QR 이미지는 프론트에서 생성
 */
router.get('/qr-create', async (req: Request, res: Response) => {
  try {
    const { meeting_number } = req.query;

    if (!meeting_number) {
      return res.status(400).json({ error: 'Missing meeting_number' });
    }

    const meetingNum = Number(meeting_number);
    if (Number.isNaN(meetingNum)) {
      return res.status(400).json({ error: 'Invalid meeting_number' });
    }

    // ✅ expires_at 계산 (10분)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    // ✅ Attendance_Session insert
    const { data: session, error: sessionError } = await supabase
      .from('Attendance_Session')
      .insert([
        {
          meeting_number: meetingNum,
          expires_at: expiresAt,
        },
      ])
      .select('qr_id, meeting_number, created_at, expires_at')
      .single();

    if (sessionError) throw sessionError;

    // ✅ 프론트에서 QR 생성할 URL만 반환
    const qrUrl = `http://localhost:3001/attendance?meeting_number=${session.meeting_number}&qr_id=${session.qr_id}`;

    return res.json({
      message: 'QR session created successfully',
      qr_url: qrUrl, // 🔥 프론트에서 이걸 QR로 변환
      session,
    });
  } catch (err: any) {
    console.error('[qr-create] error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
