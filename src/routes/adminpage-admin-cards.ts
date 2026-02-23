import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * GET /api/admin-cards
 * Public. Returns all admin cards ordered by display_order (for LandingPage).
 */
router.get("/admin-cards", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("Admin_Cards")
    .select("id, member_id, position, display_name, description, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[admin-cards GET] error:", error);
    return res.status(500).json({ error: "Failed to fetch admin cards", detail: error.message });
  }

  res.json({ cards: data ?? [] });
});

/**
 * POST /api/adminpage/admin-cards
 * Creates a new admin card.
 * Body: { position, display_name, description?, member_id?, display_order? }
 */
router.post("/adminpage/admin-cards", async (req: Request, res: Response) => {
  const { position, display_name, description, member_id, display_order } = req.body;

  if (!position || !display_name) {
    return res.status(400).json({ error: "position and display_name are required" });
  }

  const { data, error } = await supabase
    .from("Admin_Cards")
    .insert({
      position,
      display_name,
      description: description ?? null,
      member_id: member_id ? Number(member_id) : null,
      display_order: display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[admin-cards POST] error:", error);
    return res.status(500).json({ error: "Failed to create admin card", detail: error.message });
  }

  res.status(201).json({ card: data });
});

/**
 * PUT /api/adminpage/admin-cards/:id
 * Updates an admin card.
 * Body: { position?, display_name?, description?, member_id?, display_order? }
 */
router.put("/adminpage/admin-cards/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { position, display_name, description, member_id, display_order } = req.body;

  const updates: Record<string, any> = {};
  if (position !== undefined) updates.position = position;
  if (display_name !== undefined) updates.display_name = display_name;
  if (description !== undefined) updates.description = description;
  if (member_id !== undefined) updates.member_id = member_id ? Number(member_id) : null;
  if (display_order !== undefined) updates.display_order = Number(display_order);

  const { data, error } = await supabase
    .from("Admin_Cards")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin-cards PUT] error:", error);
    return res.status(500).json({ error: "Failed to update admin card", detail: error.message });
  }

  res.json({ card: data });
});

/**
 * DELETE /api/adminpage/admin-cards/:id
 * Deletes an admin card.
 */
router.delete("/adminpage/admin-cards/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const { error } = await supabase.from("Admin_Cards").delete().eq("id", id);

  if (error) {
    console.error("[admin-cards DELETE] error:", error);
    return res.status(500).json({ error: "Failed to delete admin card", detail: error.message });
  }

  res.json({ success: true });
});

export default router;
