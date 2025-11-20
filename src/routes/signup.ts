import { Router, Request, Response } from 'express';
import admin from '../firebase/firebase';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/user/signup
 * Body: { school_email, password, korean_name, english_name, graduate_year, current_university, team }
 */
router.post('/user/signup', async (req: Request, res: Response) => {
  let {
    school_email,
    password,
    korean_name,
    english_name,
    graduate_year,
    current_university,
    team,
  } = req.body;

  try {
    // 1. 공백 검사
    if (
      !school_email ||
      !password ||
      !korean_name ||
      !english_name ||
      !graduate_year ||
      !current_university ||
      !team
    ) {
      return res.status(400).json({
        error: 'All fields are required.',
      });
    }

    // 문자열 다듬기
    school_email = school_email.trim().toLowerCase();
    korean_name = korean_name.trim();
    english_name = english_name.trim();

    // 1-1. Korean Name: 한글만 허용
    if (!/^[가-힣]+$/.test(korean_name)) {
      return res.status(400).json({
        error: 'Korean Name must contain only Korean characters.',
      });
    }

    // 1-2. Korean Name: 최대 10글자 허용
    if (korean_name.length > 10) {
      return res.status(400).json({
        error: 'Korean Name must be at most 10 characters.',
      });
    }

    // 2-1. English Name: 첫글자 대문자로 변환 + 알파벳만 허용
    english_name = english_name
      .split(' ')
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');

    if (!/^[A-Za-z\s]+$/.test(english_name)) {
      return res.status(400).json({
        error: 'English name must contain only English letters.',
      });
    }

    // 2-2. English Name: 최대 50글자 허용
    if (english_name.length > 50) {
      return res.status(400).json({
        error: 'English Name must be at most 50 characters.',
      });
    }

    // 3. School Email: example@school.edu 형식 검사
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu$/.test(school_email)) {
      return res.status(400).json({
        error: 'School Email must be a valid email address.',
      });
    }

    // 4-1. Password: 최소 6글자 이상
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long.',
      });
    }

    // 4-2. Password: 공백 포함 금지
    if (/\s/.test(password)) {
      return res.status(400).json({ error: 'Password cannot contain spaces.' });
    }

    // 5-1. Graduation Year: 숫자로만 구성됐는지 확인
    if (!/^\d+$/.test(graduate_year)) {
      return res.status(400).json({
        error: 'Graduation year must contain only integers.',
      });
    }

    // 5-2. Graduation Year: 숫자 + 범위 체크
    const yearNum = Number(graduate_year);
    if (yearNum < 1950 || yearNum > 2050) {
      return res.status(400).json({
        error: 'Graduation year must be between 1950 and 2050.',
      });
    }

    // Firebase Auth 계정 생성
    const userRecord = await admin.auth().createUser({
      email: school_email,
      password,
    });

    // Supabase에 사용자 정보 저장
    const { data, error } = await supabase.from('Members').insert([
      {
        //member_id: userRecord.uid,
        school_email,
        korean_name,
        english_name,
        graduate_year: yearNum,
        current_university,
        team,
      },
    ]);

    if (error) throw error;

    res.status(201).json({
      message: 'Member registered successfully!',
      //member_id: userRecord.uid,
    });
  } catch (err: any) {
    console.error('[member-signup] error:', err);

    if (err.errorInfo?.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    res.status(500).json({ error: err.message || 'Failed to register member' });
  }
});

export default router;
