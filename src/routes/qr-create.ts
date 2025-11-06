import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';

const router = Router();

/**
 * GET /api/qr-create
 * Returns: QR code that links to the attendance page
 */
router.get('/qr-create', async (req: Request, res: Response) => {
  try {
    // 1️⃣ QR이 연결할 실제 페이지 URL
    const qrUrl = `http://localhost:3001/attendance`;

    // 2️⃣ QR 이미지 생성 (DataURL 형식)
    const qrImage = await QRCode.toDataURL(qrUrl);

    // 3️⃣ 응답 반환
    res.json({
      message: 'QR Code created successfully',
      qr_url: qrUrl,
      qr_image: qrImage,
    });
  } catch (err: any) {
    console.error('[qr-create] error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
