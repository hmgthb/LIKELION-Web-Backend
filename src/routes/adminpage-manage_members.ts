import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/adminpage/members_list
 * 어드민 페이지에서 전체 멤버 리스트 가져오기
 */
router.get('/adminpage/members_list', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('Members')
    .select(
      `
      member_id,
      korean_name,
      english_name,
      graduate_year,
      school_email,
      is_admin,
      current_university,
      team,
      is_undergraduate,
      is_mentor,
      is_graduated,
      is_active
      `
    )
    .order('member_id', { ascending: true });

  if (error) {
    console.error('[admin/members] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch members.' });
  }

  res.json({ members: data });
});

/**
 * DELETE /api/adminpage/members_delete/:member_id
 * 멤버 삭제
 */
router.delete(
  '/adminpage/members_delete/:member_id',
  async (req: Request, res: Response) => {
    const member_id = parseInt(req.params.member_id);

    if (isNaN(member_id)) {
      return res.status(400).json({ error: 'Invalid member ID' });
    }

    const { error } = await supabase
      .from('Members')
      .delete()
      .eq('member_id', member_id);

    if (error) {
      console.error('[admin/delete-member] Error:', error);
      return res.status(500).json({ error: 'Failed to delete member.' });
    }

    res.json({ message: 'Member deleted successfully!' });
  }
);

/**
 * PUT /api/adminpage/members_edit/:member_id
 * 멤버 수정
 */
router.put(
  '/adminpage/members_edit/:member_id',
  async (req: Request, res: Response) => {
    const member_id = parseInt(req.params.member_id);

    if (isNaN(member_id)) {
      return res.status(400).json({ error: 'Invalid member ID' });
    }

    // 수정할 필드(변경 가능한 항목만 업데이트)
    const updatableFields = {
      korean_name: req.body.korean_name,
      english_name: req.body.english_name,
      graduate_year: req.body.graduate_year,
      school_email: req.body.school_email,
      is_admin: req.body.is_admin,
      current_university: req.body.current_university,
      team: req.body.team,
      is_undergraduate: req.body.is_undergraduate,
      is_mentor: req.body.is_mentor,
      is_graduated: req.body.is_graduated,
      is_active: req.body.is_active,
    };

    // undefined 값 제거
    const updatePayload: any = {};
    Object.entries(updatableFields).forEach(([key, value]) => {
      if (value !== undefined) updatePayload[key] = value;
    });

    const { error } = await supabase
      .from('Members')
      .update(updatePayload)
      .eq('member_id', member_id);

    if (error) {
      console.error('[admin/update-member] Error:', error);
      return res.status(500).json({ error: 'Failed to update member.' });
    }

    res.json({ message: 'Member updated successfully!' });
  }
);

export default router;
