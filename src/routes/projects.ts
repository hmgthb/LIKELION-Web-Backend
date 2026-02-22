import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * GET /api/retrieve-all-projects
 * Returns all projects with their linked photos and members.
 */
router.get('/retrieve-all-projects', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('Projects')
    .select(`
      project_id,
      start_date,
      end_date,
      project_name,
      description,
      github_link,
      tech_stack,
      team_name,
      status,
      Project_Photo_Link:Project_Photo_Link (
        photo:Photos (
          photo_id,
          date,
          description,
          member_id,
          photo_url
        )
      ),
      Project_Member_Link:Project_Member_Link (
        member:Members (
          member_id,
          korean_name,
          english_name
        )
      )
    `)
    .order('project_id', { ascending: true });

  if (error) {
    console.error('[retrieve-all-projects] supabase error:', error);
    return res.status(500).json({ error: 'Failed to fetch projects' });
  }

  const projects = (data ?? []).map((p: any) => ({
    project_id: p.project_id,
    start_date: p.start_date,
    end_date: p.end_date,
    project_name: p.project_name,
    description: p.description,
    github_link: p.github_link,
    tech_stack: p.tech_stack ?? [],
    team_name: p.team_name,
    status: p.status,
    photos: (p.Project_Photo_Link ?? [])
      .map((link: any) => link?.photo)
      .filter(Boolean),
    members: (p.Project_Member_Link ?? [])
      .map((link: any) => link?.member)
      .filter(Boolean),
  }));

  res.json({ projects });
});

/**
 * POST /api/projects
 * Creates a new project and links members.
 * Body: { project_name, start_date?, end_date?, description?, github_link?, tech_stack?, team_name?, member_ids? }
 */
router.post('/projects', async (req: Request, res: Response) => {
  const { project_name, start_date, end_date, description, github_link, tech_stack, team_name, status, member_ids } = req.body;

  if (!project_name) {
    return res.status(400).json({ error: 'project_name is required' });
  }

  const VALID_STATUSES = ['planning', 'in_progress', 'completed'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const { data, error } = await supabase
    .from('Projects')
    .insert({ project_name, start_date, end_date, description, github_link, tech_stack: tech_stack ?? [], team_name, status: status ?? 'planning' })
    .select()
    .single();

  if (error) {
    console.error('[create-project] supabase error:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }

  if (Array.isArray(member_ids) && member_ids.length > 0) {
    const links = member_ids.map((member_id: number) => ({ project_id: data.project_id, member_id }));
    const { error: linkError } = await supabase.from('Project_Member_Link').insert(links);
    if (linkError) {
      console.error('[create-project] member link error:', linkError);
      return res.status(500).json({ error: 'Project created but failed to link members' });
    }
  }

  res.status(201).json({ project: data });
});

/**
 * PATCH /api/projects/:id
 * Updates an existing project.
 * Body: { project_name?, start_date?, end_date?, description?, github_link?, tech_stack?, team_name?, member_ids? }
 * member_ids를 전달하면 기존 멤버 링크를 교체합니다.
 */
router.patch('/projects/:id', async (req: Request, res: Response) => {
  const project_id = Number(req.params.id);
  const { project_name, start_date, end_date, description, github_link, tech_stack, team_name, status, member_ids } = req.body;

  if (isNaN(project_id)) {
    return res.status(400).json({ error: 'Invalid project_id' });
  }

  const VALID_STATUSES = ['planning', 'in_progress', 'completed'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const updates: Record<string, any> = {};
  if (project_name !== undefined) updates.project_name = project_name;
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (description !== undefined) updates.description = description;
  if (github_link !== undefined) updates.github_link = github_link;
  if (tech_stack !== undefined) updates.tech_stack = tech_stack;
  if (team_name !== undefined) updates.team_name = team_name;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0 && member_ids === undefined) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('Projects')
      .update(updates)
      .eq('project_id', project_id)
      .select()
      .single();

    if (error) {
      console.error('[update-project] supabase error:', error);
      return res.status(500).json({ error: 'Failed to update project' });
    }
  }

  // member_ids가 전달되면 기존 링크 삭제 후 새로 삽입
  if (Array.isArray(member_ids)) {
    const { error: deleteError } = await supabase
      .from('Project_Member_Link')
      .delete()
      .eq('project_id', project_id);

    if (deleteError) {
      console.error('[update-project] member unlink error:', deleteError);
      return res.status(500).json({ error: 'Failed to update member links' });
    }

    if (member_ids.length > 0) {
      const links = member_ids.map((member_id: number) => ({ project_id, member_id }));
      const { error: insertError } = await supabase.from('Project_Member_Link').insert(links);
      if (insertError) {
        console.error('[update-project] member link error:', insertError);
        return res.status(500).json({ error: 'Failed to link members' });
      }
    }
  }

  res.json({ message: 'Project updated successfully' });
});

/**
 * DELETE /api/projects/:id
 * Deletes a project by project_id.
 * Project_Member_Link, Project_Photo_Link은 ON DELETE CASCADE로 자동 삭제됩니다.
 */
router.delete('/projects/:id', async (req: Request, res: Response) => {
  const project_id = Number(req.params.id);

  if (isNaN(project_id)) {
    return res.status(400).json({ error: 'Invalid project_id' });
  }

  const { error } = await supabase
    .from('Projects')
    .delete()
    .eq('project_id', project_id);

  if (error) {
    console.error('[delete-project] supabase error:', error);
    return res.status(500).json({ error: 'Failed to delete project' });
  }

  res.status(204).send();
});

export default router;
