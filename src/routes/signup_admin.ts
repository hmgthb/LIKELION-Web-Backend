import { Router, Request, Response } from 'express';
import admin from '../firebase/firebase';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/member-users/signup
 * Body: { school_email, password, korean_name, english_name, graduate_year }
 */
router.post('/member-users/signup', async (req: Request, res: Response) => {
  const { school_email, password, korean_name, english_name, graduate_year } =
    req.body;

  try {
    const userRecord = await admin.auth().createUser({
      email: school_email,
      password,
    });

    const { data, error } = await supabase.from('Members').insert([
      {
        //member_id: userRecord.uid,
        school_email,
        korean_name,
        english_name,
        graduate_year,
        is_admin: false,
        is_active: true,
      },
    ]);

    if (error) throw error;

    res.status(201).json({
      message: 'Member registered successfully',
      //member_id: userRecord.uid,
    });
  } catch (err: any) {
    console.error('[member-signup] error:', err);
    res.status(500).json({ error: err.message || 'Failed to register member' });
  }
});

export default router;
