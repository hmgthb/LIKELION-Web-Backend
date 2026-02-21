import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import admin from '../firebase/firebase';

const router = Router();

/**
 * POST /api/adminpage/save_manage_members
 * 여러 수정/삭제 작업을 한 번에 저장.
 */
router.post(
  '/adminpage/save_manage_members',
  async (req: Request, res: Response) => {
    const { updates, deletes } = req.body;

    try {
      /** 1. 삭제 처리 */
      if (Array.isArray(deletes) && deletes.length > 0) {
        // Supabase에서 이메일 조회 후 Firebase 유저도 삭제
        const { data: memberEmails, error: emailErr } = await supabase
          .from('Members')
          .select('school_email')
          .in('member_id', deletes);

        if (emailErr) throw emailErr;

        for (const member of (memberEmails || [])) {
          try {
            const userRecord = await admin.auth().getUserByEmail(member.school_email);
            await admin.auth().deleteUser(userRecord.uid);
          } catch (firebaseErr: any) {
            console.warn(`[admin/bulk-save] Firebase user not found for ${member.school_email}:`, firebaseErr.message);
          }
        }

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

      /** 3. 성공 응답 */
      res.json({ message: 'All changes saved successfully!' });
    } catch (err: any) {
      console.error('[admin/bulk-save] Error:', err);
      res.status(500).json({ error: 'Failed to save bulk changes.' });
    }
  }
);

export default router;
