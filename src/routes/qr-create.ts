import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';

const router = Router();

/**
 * GET /api/qr-create?meeting_number=5
 * Returns: QR code that links to attendance page with meeting number
 */
router.get('/qr-create', async (req: Request, res: Response) => {
  try {
    const { meeting_number } = req.query;

    if (!meeting_number) {
      return res.status(400).json({ error: 'Missing meeting_number' });
    }

    // 1️⃣ QR이 연결할 실제 페이지 URL (프론트엔드)
    const qrUrl = `http://localhost:3001/attendance?meeting_number=${meeting_number}`;

    // 2️⃣ QR 이미지 생성 (Base64 DataURL)
    const qrImage = await QRCode.toDataURL(qrUrl);

    // 3️⃣ 성공 응답
    res.json({
      message: 'QR Code created successfully',
      qr_url: qrUrl,
      qr_image: qrImage,
      meeting_number,
    });
  } catch (err: any) {
    console.error('[qr-create] error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
