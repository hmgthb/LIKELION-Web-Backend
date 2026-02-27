import { Router, Request, Response } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/retrieve-all-photos
 * Returns all photos linked to members and projects.
 */
router.get("/retrieve-all-photos", async (_req: Request, res: Response) => {
  try {
    // --- 1. Link tables ---
    const [
      { data: memberLinks, error: memberLinksError },
      { data: projectLinks, error: projectLinksError },
    ] = await Promise.all([
      supabase.from("Members_Photos").select("id, member_id, photo_id"),
      supabase.from("Projects_Photos").select("id, project_id, photo_id"),
    ]);

    if (memberLinksError) throw memberLinksError;
    if (projectLinksError) throw projectLinksError;

    // --- 2. Collect all referenced photo_ids ---
    const photoIds = [
      ...new Set([
        ...(memberLinks ?? []).map((m: any) => m.photo_id),
        ...(projectLinks ?? []).map((p: any) => p.photo_id),
      ].filter(Boolean)),
    ];

    // --- 3. Fetch Photos in one query ---
    let photoMap: Record<number, any> = {};
    if (photoIds.length > 0) {
      const { data: photos, error: photosError } = await supabase
        .from("Photos")
        .select("photo_id, date, description, member_id, photo_url")
        .in("photo_id", photoIds);

      if (photosError) throw photosError;

      photoMap = Object.fromEntries((photos ?? []).map((p: any) => [p.photo_id, p]));
    }

    // --- 4. Normalize / Flatten results ---
    const memberPhotoList = (memberLinks ?? []).map((m: any) => {
      const photo = photoMap[m.photo_id] ?? {};
      return {
        link_id: m.id,
        member_id: m.member_id,
        photo_id: m.photo_id,
        date: photo.date,
        description: photo.description,
        photo_url: photo.photo_url,
        source: "member",
      };
    });

    const projectPhotoList = (projectLinks ?? []).map((p: any) => {
      const photo = photoMap[p.photo_id] ?? {};
      return {
        project_link_id: p.id,
        project_id: p.project_id,
        photo_id: p.photo_id,
        date: photo.date,
        description: photo.description,
        photo_url: photo.photo_url,
        source: "project",
      };
    });

    res.json({ photos: [...memberPhotoList, ...projectPhotoList] });
  } catch (err: any) {
    console.error("[retrieve-all-photos] error:", err);
    res.status(500).json({ error: "Failed to retrieve all photos", detail: err?.message ?? err });
  }
});

/**
 * POST /api/photos/upload
 * Uploads a photo to Supabase Storage and saves metadata to Photos table.
 * Form-data: file (required), date?, description?, member_id?, linked_member_id?, linked_project_id?
 */
router.post("/photos/upload", upload.single("file"), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "file is required" });
  }

  const { date, description, member_id, linked_member_id, linked_project_id } = req.body;

  // 파일명 중복 방지를 위해 타임스탬프 prefix 추가
  const fileName = `${Date.now()}_${file.originalname}`;

  // 1. Supabase Storage에 파일 업로드
  const { error: storageError } = await supabase.storage
    .from("photos")
    .upload(fileName, file.buffer, { contentType: file.mimetype });

  if (storageError) {
    console.error("[photos/upload] storage error:", storageError);
    return res.status(500).json({ error: "Failed to upload file" });
  }

  // 2. public URL 생성
  const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
  const photo_url = urlData.publicUrl;

  // 3. Photos 테이블에 메타데이터 저장
  const { data: photo, error: dbError } = await supabase
    .from("Photos")
    .insert({ date, description, member_id: member_id ? Number(member_id) : null, photo_url })
    .select()
    .single();

  if (dbError) {
    console.error("[photos/upload] db error:", dbError);
    return res.status(500).json({ error: "Failed to save photo metadata" });
  }

  // 4. 멤버 또는 프로젝트에 연결 (기존 사진이 있으면 모두 교체)
  if (linked_member_id) {
    // 기존 링크 전체 조회
    const { data: existingLinks } = await supabase
      .from("Members_Photos")
      .select("id, photo_id")
      .eq("member_id", Number(linked_member_id));

    if (existingLinks && existingLinks.length > 0) {
      const oldPhotoIds = existingLinks.map((l: any) => l.photo_id);

      // 기존 photo_url 조회
      const { data: oldPhotos } = await supabase
        .from("Photos")
        .select("photo_url")
        .in("photo_id", oldPhotoIds);

      // 링크 삭제
      await supabase.from("Members_Photos").delete().eq("member_id", Number(linked_member_id));
      // Photos 레코드 삭제
      await supabase.from("Photos").delete().in("photo_id", oldPhotoIds);
      // Storage 파일 삭제
      const oldFileNames = (oldPhotos ?? [])
        .map((p: any) => p.photo_url?.split("/photos/").pop())
        .filter(Boolean);
      if (oldFileNames.length > 0) await supabase.storage.from("photos").remove(oldFileNames);
    }

    const { error: linkError } = await supabase
      .from("Members_Photos")
      .insert({ member_id: Number(linked_member_id), photo_id: photo.photo_id });
    if (linkError) console.error("[photos/upload] member link error:", linkError);
  }

  if (linked_project_id) {
    // 기존 링크 전체 조회
    const { data: existingLinks } = await supabase
      .from("Projects_Photos")
      .select("id, photo_id")
      .eq("project_id", Number(linked_project_id));

    if (existingLinks && existingLinks.length > 0) {
      const oldPhotoIds = existingLinks.map((l: any) => l.photo_id);

      // 기존 photo_url 조회
      const { data: oldPhotos } = await supabase
        .from("Photos")
        .select("photo_url")
        .in("photo_id", oldPhotoIds);

      // 링크 삭제
      await supabase.from("Projects_Photos").delete().eq("project_id", Number(linked_project_id));
      // Photos 레코드 삭제
      await supabase.from("Photos").delete().in("photo_id", oldPhotoIds);
      // Storage 파일 삭제
      const oldFileNames = (oldPhotos ?? [])
        .map((p: any) => p.photo_url?.split("/photos/").pop())
        .filter(Boolean);
      if (oldFileNames.length > 0) await supabase.storage.from("photos").remove(oldFileNames);
    }

    const { error: linkError } = await supabase
      .from("Projects_Photos")
      .insert({ project_id: Number(linked_project_id), photo_id: photo.photo_id });
    if (linkError) console.error("[photos/upload] project link error:", linkError);
  }

  res.status(201).json({ photo });
});

/**
 * DELETE /api/photos/delete
 * Deletes a photo: removes the link record, the Photos row, and the Storage file.
 * Body: { photo_id, link_id? (Members_Photos.id), project_link_id? (Project_Photo_Link.id) }
 */
router.delete("/photos/delete", async (req: Request, res: Response) => {
  const { photo_id, link_id, project_link_id } = req.body;

  if (!photo_id) {
    return res.status(400).json({ error: "photo_id is required" });
  }

  try {
    // 1. Delete link record
    if (link_id) {
      const { error } = await supabase.from("Members_Photos").delete().eq("id", link_id);
      if (error) throw error;
    } else if (project_link_id) {
      const { error } = await supabase
        .from("Projects_Photos")
        .delete()
        .eq("id", project_link_id);
      if (error) throw error;
    }

    // 2. Get photo_url to delete from Storage
    const { data: photoRow, error: fetchError } = await supabase
      .from("Photos")
      .select("photo_url")
      .eq("photo_id", photo_id)
      .single();

    if (fetchError) throw fetchError;

    // 3. Delete from Photos table
    const { error: deleteError } = await supabase.from("Photos").delete().eq("photo_id", photo_id);
    if (deleteError) throw deleteError;

    // 4. Delete from Storage (extract filename from URL)
    if (photoRow?.photo_url) {
      const fileName = photoRow.photo_url.split("/photos/").pop();
      if (fileName) {
        await supabase.storage.from("photos").remove([fileName]);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[photos/delete] error:", err);
    res.status(500).json({ error: "Failed to delete photo", detail: err?.message ?? err });
  }
});

/**
 * PUT /api/photos/update
 * Updates photo description and optionally the linked member or project.
 * Body: { photo_id, description?, link_id? (Members_Photos.id), linked_member_id?, project_link_id? (Project_Photo_Link.id), linked_project_id? }
 */
router.put("/photos/update", async (req: Request, res: Response) => {
  const { photo_id, description, link_id, linked_member_id, project_link_id, linked_project_id } = req.body;

  if (!photo_id) {
    return res.status(400).json({ error: "photo_id is required" });
  }

  try {
    // 1. Update description in Photos
    const { error: updateError } = await supabase
      .from("Photos")
      .update({ description })
      .eq("photo_id", photo_id);

    if (updateError) throw updateError;

    // 2. Update linked member if provided
    if (link_id && linked_member_id) {
      const { error: linkError } = await supabase
        .from("Members_Photos")
        .update({ member_id: Number(linked_member_id) })
        .eq("id", link_id);

      if (linkError) throw linkError;
    }

    // 3. Update linked project if provided
    if (project_link_id && linked_project_id) {
      const { error: linkError } = await supabase
        .from("Projects_Photos")
        .update({ project_id: Number(linked_project_id) })
        .eq("id", project_link_id);

      if (linkError) throw linkError;
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("[photos/update] error:", err);
    res.status(500).json({ error: "Failed to update photo", detail: err?.message ?? err });
  }
});

export default router;
