import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/retrieve-all-projects
 * Returns all projects with their linked photos.
 */
router.get('/retrieve-all-projects', async (_req: Request, res: Response) => {
  // One-shot nested select using defined FKs between:
  // Projects (project_id) -> Project_Photo_Link(project_id)
  // Project_Photo_Link(photo_id) -> Photos(photo_id)
  const { data, error } = await supabase
    .from('Projects')
    .select(`
      project_id,
      start_date,
      end_date,
      project_name,
      description,
      github_link,
      coding_language,
      team_name,
      Project_Photo_Link:Project_Photo_Link (
        photo:Photos (
          photo_id,
          date,
          description,
          member_id,
          photo_url
        )
      )
    `)
    .order('project_id', { ascending: true });

  if (error) {
    console.error('[retrieve-all-projects] supabase error:', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }

  // Normalize: flatten nested link objects into `photos: Photo[]`
  const projects = (data ?? []).map((p: any) => ({
    project_id: p.project_id,
    start_date: p.start_date,
    end_date: p.end_date,
    project_name: p.project_name,
    description: p.description,
    github_link: p.github_link,
    coding_language: p.coding_language,
    team_name: p.team_name,
    photos: (p.Project_Photo_Link ?? [])
      .map((link: any) => link?.photo)
      .filter(Boolean),
  }));

  res.json({ projects });
});

export default router;
