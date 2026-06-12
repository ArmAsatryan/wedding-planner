import { Response, NextFunction } from 'express';
import { MemberRole } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { param } from '../utils/params.js';
import { AuthRequest } from './auth.js';

const roleHierarchy: Record<MemberRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

export async function getProjectRole(userId: string, projectId: string): Promise<MemberRole | null> {
  const project = await prisma.weddingProject.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) return null;
  if (project.ownerId === userId) return 'OWNER';

  const member = project.members.find((m) => m.userId === userId);
  return member?.role ?? null;
}

export function projectAccess(minRole: MemberRole = 'VIEWER') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const projectId = param(req, 'projectId') || (req.body.projectId as string);
    if (!projectId) {
      return res.status(400).json({ error: 'Նախագծի ID-ն պահանջվում է' });
    }

    const role = await getProjectRole(req.user!.id, projectId);
    if (!role || roleHierarchy[role] < roleHierarchy[minRole]) {
      return res.status(403).json({ error: 'Մուտքը արգելված է' });
    }

    req.projectRole = role;
    next();
  };
}

export function canEdit(role?: MemberRole) {
  return role === 'OWNER' || role === 'EDITOR';
}
