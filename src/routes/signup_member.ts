import { Router, Request, Response } from 'express';
import admin from '../firebase/firebase';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/member-users/signup
 * Body: { school_email, password, korean_name, english_name, graduate_year, current_university, team }
 */
router.post('/member-users/signup', async (req: Request, res: Response) => {
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
    // 비어 있는 값 체크
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

    // 이메일을 공백 없는 소문자로 전환
    school_email = school_email.trim().toLowerCase();

    // Korean Name 앞뒤 공백 제거
    korean_name = korean_name.trim();

    // Korean Name이 한글로 이루어져 있는지 확인
    if (!/^[가-힣]+$/.test(korean_name)) {
      return res.status(400).json({
        error: 'Korean Name must contain only Korean characters.',
      });
    }

    // 자동 Capitalization: 각 단어 첫 글자 대문자로 변경
    english_name = english_name
      .split(' ')
      .map(
        (word: string) =>
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');

    // English Name이 영어로 이루어져 있는지 확인
    if (!/^[A-Za-z\s]+$/.test(english_name)) {
      return res.status(400).json({
        error: 'English name must contain only English letters.',
      });
    }

    // @school.edu 형식으로 끝나는 이메일인지 확인
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.edu$/.test(school_email)) {
      return res.status(400).json({
        error: 'School email required (example@school.edu).',
      });
    }

    // password에 공백이 포함되는지 확인
    if (/\s/.test(password)) {
      return res.status(400).json({ error: 'Password cannot contain spaces.' });
    }

    // graduate_year 숫자 변환
    graduate_year = Number(graduate_year);

    // graduate_year이 숫자가 맞는지, 1950년부터 2050년 사이인지 확인
    if (
      isNaN(graduate_year) ||
      !Number.isInteger(graduate_year) ||
      graduate_year < 1950 ||
      graduate_year > 2050
    ) {
      return res.status(400).json({
        error: 'Graduation year must be an integer between 1950 and 2050.',
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
        graduate_year,
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
