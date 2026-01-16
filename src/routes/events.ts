import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD
 * 누구나 조회 (모든 멤버가 볼 수 있게)
 */
router.get('/events', async (req: Request, res: Response) => {
  const { start, end } = req.query;

  try {
    let query = supabase
      .from('Events')
      .select('*')
      .order('start_date', { ascending: true });

    // 날짜 범위 필터 (선택)
    if (start) query = query.gte('start_date', `${start}T00:00:00-05:00`);
    if (end) query = query.lte('start_date', `${end}T23:59:59-05:00`);

    const { data, error } = await query;
    if (error) throw error;

    return res.status(200).json({ events: data || [] });
  } catch (err: any) {
    console.error('[events] list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /api/events
 * 운영진만 생성 (여기서는 "admin 검증" 미들웨어를 붙이는 자리)
 */
router.post('/events', async (req: Request, res: Response) => {
  const {
    event_title,
    category,
    start_date,
    end_date,
    location,
    description,
    is_public,
  } = req.body;

  if (!event_title || !category || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // TODO: 여기서 토큰 검증 -> member_id 추출 -> is_admin 확인
    // const memberId = req.user.member_id;

    const { data, error } = await supabase
      .from('Events')
      .insert([
        {
          event_title,
          category,
          start_date,
          end_date,
          location: location || null,
          description: description || null,
          // created_by: memberId,
          is_public: is_public ?? true,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json({ event: data });
  } catch (err: any) {
    console.error('[events] create error:', err.message);
    return res.status(500).json({ error: 'Failed to create event' });
  }
});

export default router;
