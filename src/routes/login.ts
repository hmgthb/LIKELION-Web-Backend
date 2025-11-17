import { Router, Request, Response } from 'express';
import admin from '../firebase/firebase';
import { supabase } from '../lib/supabase';
import axios from 'axios';

const router = Router();

/**
 * POST /api/login
 * Body: { school_email, password }
 */
router.post('/login', async (req: Request, res: Response) => {
  let { school_email, password } = req.body;

  if (!school_email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  school_email = school_email.toLowerCase();

  try {
    // ✅ Firebase REST API를 이용해서 로그인
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const firebaseAuthUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

    const response = await axios.post<{
      idToken: string;
      localId: string;
    }>(firebaseAuthUrl, {
      email: school_email,
      password,
      returnSecureToken: true,
    });

    const { idToken, localId } = response.data;

    // ✅ Supabase에서 사용자 정보 가져오기
    const { data: users, error } = await supabase
      .from('Members')
      .select('*')
      .eq('school_email', school_email);

    if (error) throw error;

    // users는 배열로 반환됩니다
    const user = users?.[0];

    res.status(200).json({
      message: 'Login successful',
      firebase: {
        uid: localId,
        idToken,
      },
      supabase: user,
    });
  } catch (err: any) {
    console.error('[login] error:', err.response?.data || err.message);

    const firebaseError = err.response?.data?.error?.message;

    if (
      firebaseError === 'EMAIL_NOT_FOUND' ||
      firebaseError === 'INVALID_PASSWORD'
    ) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res
      .status(500)
      .json({ error: err.message || 'Failed to log in. Please try again.' });
  }
});

export default router;
