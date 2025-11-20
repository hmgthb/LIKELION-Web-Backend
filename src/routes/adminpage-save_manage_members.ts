import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * POST /api/adminpage/save_manage_members
 * 여러 수정/삭제/추가 작업을 한 번에 저장.
 */
router.post(
  '/adminpage/save_manage_members',
  async (req: Request, res: Response) => {
    const { updates, deletes, inserts } = req.body;

    try {
      /** 1. 삭제 처리 */
      if (Array.isArray(deletes) && deletes.length > 0) {
        const { error: deleteError } = await supabase
          .from('Members')
          .delete()
          .in('member_id', deletes);

        if (deleteError) throw deleteError;
      }

      /** 2. 수정 처리 */
      if (Array.isArray(updates) && updates.length > 0) {
        for (const updateObj of updates) {
          const member_id = updateObj.member_id;
          const updatePayload = { ...updateObj };
          delete updatePayload.member_id;

          const { error: updateError } = await supabase
            .from('Members')
            .update(updatePayload)
            .eq('member_id', member_id);

          if (updateError) throw updateError;
        }
      }

      /** 3. 추가 처리 */
      if (Array.isArray(inserts) && inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('Members')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      /** 4. 성공 응답 */
      res.json({ message: 'All changes saved successfully!' });
    } catch (err: any) {
      console.error('[admin/bulk-save] Error:', err);
      res.status(500).json({ error: 'Failed to save bulk changes.' });
    }
  }
);

export default router;
