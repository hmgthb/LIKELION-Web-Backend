import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * GET /api/retrieve-all-photos
 * Returns all photos linked to members and projects.
 */
router.get("/retrieve-all-photos", async (_req: Request, res: Response) => {
  try {
    // --- Retrieve member photos ---
    const { data: memberPhotos, error: memberError } = await supabase
      .from("Members_Photos")
      .select(`
        id,
        member_id,
        photo:Photos (
          photo_id,
          date,
          description,
          member_id,
          photo_url
        )
      `);

    if (memberError) throw memberError;

    // --- Retrieve project photos ---
    const { data: projectPhotos, error: projectError } = await supabase
      .from("Projects_Photos")
      .select(`
        id,
        project_id,
        photo:Photos (
          photo_id,
          date,
          description,
          member_id,
          photo_url
        ),
        project_photo_url
      `);

    if (projectError) throw projectError;

    // --- Normalize / Flatten results ---
    const memberPhotoList = (memberPhotos ?? []).map((m: any) => ({
      link_id: m.id,
      member_id: m.member_id,
      photo_id: m.photo?.photo_id,
      date: m.photo?.date,
      description: m.photo?.description,
      photo_url: m.photo?.photo_url,
      source: "member",
    }));

    const projectPhotoList = (projectPhotos ?? []).map((p: any) => ({
      link_id: p.id,
      project_id: p.project_id,
      photo_id: p.photo?.photo_id,
      date: p.photo?.date,
      description: p.photo?.description,
      photo_url: p.photo?.photo_url ?? p.project_photo_url,
      source: "project",
    }));

    const allPhotos = [...memberPhotoList, ...projectPhotoList];

    res.json({ photos: allPhotos });
  } catch (err) {
    console.error("[retrieve-all-photos] error:", err);
    res.status(500).json({ error: "Failed to retrieve all photos" });
  }
});

export default router;
