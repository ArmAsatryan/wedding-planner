import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const inviteSchema = z.object({
  email: z.string().email('Վավեր էլ. փոստ մուտքագրեք'),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'),
});

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const project = await prisma.weddingProject.findUnique({
    where: { id: param(req, 'projectId') },
    include: {
      owner: { select: { id: true, email: true, name: true } },
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
    },
  });

  if (!project) return res.status(404).json({ error: 'Նախագիծը չի գտնվել' });

  res.json({
    owner: { ...project.owner, role: 'OWNER' },
    members: project.members.map((m) => ({
      id: m.id,
      role: m.role,
      invitedAt: m.invitedAt,
      user: m.user,
    })),
  });
});

router.post('/invite', projectAccess('OWNER'), async (req: AuthRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return res.status(404).json({
      error: 'Օգտատերը չի գտնվել։ Նախ հրավիրեք նրան գրանցվել հավելվածում։',
    });
  }

  const project = await prisma.weddingProject.findUnique({ where: { id: param(req, 'projectId') } });
  if (project?.ownerId === user.id) {
    return res.status(400).json({ error: 'Նախագծի սեփականատերը արդեն ունի լիակատար մուտք' });
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: param(req, 'projectId'), userId: user.id } },
    create: {
      projectId: param(req, 'projectId'),
      userId: user.id,
      role: parsed.data.role,
    },
    update: { role: parsed.data.role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  res.status(201).json(member);
});

router.delete('/:memberId', projectAccess('OWNER'), async (req: AuthRequest, res) => {
  await prisma.projectMember.delete({ where: { id: param(req, 'memberId') } });
  res.json({ message: 'Խմբագիրը հեռացված է' });
});

export default router;
