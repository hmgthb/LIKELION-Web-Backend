import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * Helper: order_num >= from 인 카드들을 +1 shift (삽입 시 자리 확보)
 */
async function shiftUp(from: number) {
  const { data } = await supabase
    .from("AdminCards_Order")
    .select("card_id, order_num")
    .gte("order_num", from);
  if (data && data.length > 0) {
    await supabase.from("AdminCards_Order").upsert(
      data.map((o: any) => ({ card_id: o.card_id, order_num: o.order_num + 1 }))
    );
  }
}

/**
 * Helper: order_num > from 인 카드들을 -1 shift (삭제 후 빈 자리 채우기)
 */
async function shiftDown(from: number) {
  const { data } = await supabase
    .from("AdminCards_Order")
    .select("card_id, order_num")
    .gt("order_num", from);
  if (data && data.length > 0) {
    await supabase.from("AdminCards_Order").upsert(
      data.map((o: any) => ({ card_id: o.card_id, order_num: o.order_num - 1 }))
    );
  }
}

/**
 * GET /api/admin-cards
 * Public. Returns all admin cards ordered by order_num.
 */
router.get("/admin-cards", async (_req: Request, res: Response) => {
  try {
    // 1. AdminCards_Order에서 순서 조회
    const { data: orders, error: orderError } = await supabase
      .from("AdminCards_Order")
      .select("card_id, order_num")
      .order("order_num", { ascending: true });

    if (orderError) throw orderError;
    if (!orders || orders.length === 0) return res.json({ cards: [] });

    // 2. Admin_Cards에서 카드 상세 조회
    const cardIds = orders.map((o: any) => o.card_id);
    const { data: cards, error: cardsError } = await supabase
      .from("Admin_Cards")
      .select("card_id, member_id, position, display_name, description")
      .in("card_id", cardIds);

    if (cardsError) throw cardsError;

    // 3. 순서대로 합치기
    const cardMap = Object.fromEntries((cards ?? []).map((c: any) => [c.card_id, c]));
    const result = orders.map((o: any) => ({
      ...cardMap[o.card_id],
      order_num: o.order_num,
    }));

    res.json({ cards: result });
  } catch (err: any) {
    console.error("[admin-cards GET] error:", err);
    res.status(500).json({ error: "Failed to fetch admin cards", detail: err.message });
  }
});

/**
 * POST /api/adminpage/admin-cards
 * Creates a new admin card.
 * Body: { position, display_name, description?, member_id?, order_num? }
 * order_num 미입력 시 맨 끝에 추가.
 * order_num 입력 시 해당 위치에 삽입하고 기존 카드들을 shift.
 */
router.post("/adminpage/admin-cards", async (req: Request, res: Response) => {
  const { position, display_name, description, member_id, order_num } = req.body;

  if (!position || !display_name) {
    return res.status(400).json({ error: "position and display_name are required" });
  }

  try {
    // 1. Admin_Cards에 카드 삽입
    const { data: card, error: cardError } = await supabase
      .from("Admin_Cards")
      .insert({
        position,
        display_name,
        description: description ?? null,
        member_id: member_id ? Number(member_id) : null,
      })
      .select()
      .single();

    if (cardError) throw cardError;

    // 2. order_num 결정
    let targetOrder: number;
    if (order_num !== undefined) {
      targetOrder = Number(order_num);
      // 해당 위치 이후 카드들 +1 shift
      await shiftUp(targetOrder);
    } else {
      // 맨 끝에 추가: 현재 최대 order_num + 1
      const { data: maxRow } = await supabase
        .from("AdminCards_Order")
        .select("order_num")
        .order("order_num", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetOrder = maxRow ? maxRow.order_num + 1 : 1;
    }

    // 3. AdminCards_Order에 순서 삽입
    const { error: orderError } = await supabase
      .from("AdminCards_Order")
      .insert({ card_id: card.card_id, order_num: targetOrder });

    if (orderError) throw orderError;

    res.status(201).json({ card: { ...card, order_num: targetOrder } });
  } catch (err: any) {
    console.error("[admin-cards POST] error:", err);
    res.status(500).json({ error: "Failed to create admin card", detail: err.message });
  }
});

/**
 * PUT /api/adminpage/admin-cards/:id
 * Updates an admin card.
 * Body: { position?, display_name?, description?, member_id?, order_num? }
 * order_num 변경 시: 이동 방향에 따라 사이 카드들만 최소한으로 shift.
 */
router.put("/adminpage/admin-cards/:id", async (req: Request, res: Response) => {
  const card_id = Number(req.params.id);
  const { position, display_name, description, member_id, order_num } = req.body;

  try {
    // 1. 카드 필드 업데이트
    const updates: Record<string, any> = {};
    if (position !== undefined) updates.position = position;
    if (display_name !== undefined) updates.display_name = display_name;
    if (description !== undefined) updates.description = description;
    if (member_id !== undefined) updates.member_id = member_id ? Number(member_id) : null;

    let card = null;
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabase
        .from("Admin_Cards")
        .update(updates)
        .eq("card_id", card_id)
        .select()
        .single();
      if (error) throw error;
      card = data;
    }

    // 2. 순서 변경
    if (order_num !== undefined) {
      const new_order = Number(order_num);

      const { data: currentOrder, error: currentError } = await supabase
        .from("AdminCards_Order")
        .select("order_num")
        .eq("card_id", card_id)
        .single();

      if (currentError) throw currentError;
      const old_order = currentOrder.order_num;

      if (old_order !== new_order) {
        if (new_order > old_order) {
          // 아래로 이동: (old, new] 범위 카드들 -1
          const { data: affected } = await supabase
            .from("AdminCards_Order")
            .select("card_id, order_num")
            .gt("order_num", old_order)
            .lte("order_num", new_order)
            .neq("card_id", card_id);

          if (affected && affected.length > 0) {
            await supabase.from("AdminCards_Order").upsert(
              affected.map((o: any) => ({ card_id: o.card_id, order_num: o.order_num - 1 }))
            );
          }
        } else {
          // 위로 이동: [new, old) 범위 카드들 +1
          const { data: affected } = await supabase
            .from("AdminCards_Order")
            .select("card_id, order_num")
            .gte("order_num", new_order)
            .lt("order_num", old_order)
            .neq("card_id", card_id);

          if (affected && affected.length > 0) {
            await supabase.from("AdminCards_Order").upsert(
              affected.map((o: any) => ({ card_id: o.card_id, order_num: o.order_num + 1 }))
            );
          }
        }

        // 이 카드의 order_num 업데이트
        const { error: updateOrderError } = await supabase
          .from("AdminCards_Order")
          .update({ order_num: new_order })
          .eq("card_id", card_id);

        if (updateOrderError) throw updateOrderError;
      }
    }

    res.json({ card: { ...(card ?? { card_id }), order_num } });
  } catch (err: any) {
    console.error("[admin-cards PUT] error:", err);
    res.status(500).json({ error: "Failed to update admin card", detail: err.message });
  }
});

/**
 * DELETE /api/adminpage/admin-cards/:id
 * Deletes an admin card and shifts subsequent order_nums down by 1.
 */
router.delete("/adminpage/admin-cards/:id", async (req: Request, res: Response) => {
  const card_id = Number(req.params.id);

  try {
    // 1. 삭제할 카드의 order_num 조회
    const { data: orderRow } = await supabase
      .from("AdminCards_Order")
      .select("order_num")
      .eq("card_id", card_id)
      .maybeSingle();

    // 2. 카드 삭제 (AdminCards_Order ON DELETE CASCADE 가정)
    const { error: deleteError } = await supabase
      .from("Admin_Cards")
      .delete()
      .eq("card_id", card_id);

    if (deleteError) throw deleteError;

    // 3. 삭제된 위치 이후 카드들 -1 shift → 1,2,3,... 연속성 유지
    if (orderRow) {
      await shiftDown(orderRow.order_num);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[admin-cards DELETE] error:", err);
    res.status(500).json({ error: "Failed to delete admin card", detail: err.message });
  }
});

export default router;
