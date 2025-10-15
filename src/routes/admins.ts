import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * GET /api/retrieve-all-admin
 * Returns all members where is_admin=true with their linked photos.
 */
router.get("/retrieve-all-admin", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("Members")
    .select(`
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
      is_active,
      Members_Photos:Members_Photos (
        photo:Photos (
          photo_id,
          date,
          description,
          member_id,
          photo_url
        )
      )
    `)
    .eq("is_admin", true)
    .order("member_id", { ascending: true });

  if (error) {
    console.error("[retrieve-all-admin] supabase error:", error);
    return res.status(500).json({ error: "Failed to fetch admin members" });
  }

  // Flatten the join table into `photos: Photo[]`
  const members = (data ?? []).map((m: any) => ({
    member_id: m.member_id,
    korean_name: m.korean_name,
    english_name: m.english_name,
    graduate_year: m.graduate_year,
    school_email: m.school_email,
    is_admin: m.is_admin,
    current_university: m.current_university,
    team: m.team,
    is_undergraduate: m.is_undergraduate,
    is_mentor: m.is_mentor,
    is_graduated: m.is_graduated,
    is_active: m.is_active,
    photos: (m.Members_Photos ?? [])
      .map((link: any) => link?.photo)
      .filter(Boolean),
  }));

  res.json({ members });
});

export default router;
