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

/**
 * GET /api/events/:id
 * 단일 이벤트 조회
 */
router.get('/events/:id', async (req: Request, res: Response) => {
  const event_id = Number(req.params.id);

  if (isNaN(event_id)) {
    return res.status(400).json({ error: 'Invalid event_id' });
  }

  try {
    const { data, error } = await supabase
      .from('Events')
      .select('*')
      .eq('event_id', event_id)
      .single();

    if (error) throw error;
    return res.status(200).json({ event: data });
  } catch (err: any) {
    console.error('[events] get error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch event' });
  }
});

async function updateEvent(req: Request, res: Response) {
  const event_id = Number(req.params.id);

  if (isNaN(event_id)) {
    return res.status(400).json({ error: 'Invalid event_id' });
  }

  const { event_title, category, start_date, end_date, location, description, is_public } = req.body;

  const updates: Record<string, any> = {};
  if (event_title !== undefined) updates.event_title = event_title;
  if (category !== undefined) updates.category = category;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (location !== undefined) updates.location = location;
  if (description !== undefined) updates.description = description;
  if (is_public !== undefined) updates.is_public = is_public;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const { data, error } = await supabase
      .from('Events')
      .update(updates)
      .eq('event_id', event_id)
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json({ event: data });
  } catch (err: any) {
    console.error('[events] update error:', err.message);
    return res.status(500).json({ error: 'Failed to update event' });
  }
}

/**
 * PUT /api/events/:id
 * PATCH /api/events/:id
 * 이벤트 수정
 */
router.put('/events/:id', updateEvent);
router.patch('/events/:id', updateEvent);

/**
 * DELETE /api/events/:id
 * 이벤트 삭제
 */
router.delete('/events/:id', async (req: Request, res: Response) => {
  const event_id = Number(req.params.id);

  if (isNaN(event_id)) {
    return res.status(400).json({ error: 'Invalid event_id' });
  }

  try {
    const { error } = await supabase
      .from('Events')
      .delete()
      .eq('event_id', event_id);

    if (error) throw error;
    return res.status(204).send();
  } catch (err: any) {
    console.error('[events] delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
