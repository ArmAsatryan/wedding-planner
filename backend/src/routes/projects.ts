import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { DEFAULT_INVITATION_TEMPLATE } from '../lib/constants.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { buildProjectSummary } from '../utils/projectSummary.js';
import { param } from '../utils/params.js';

const router = Router();

const projectSchema = z.object({
  brideName: z.string().min(1, 'Հարսի անունը պարտադիր է'),
  groomName: z.string().min(1, 'Փեսայի անունը պարտադիր է'),
  weddingDate: z.string().min(1, 'Հարսանիքի ամսաթիվը պարտադիր է'),
  totalBudget: z.number().min(0, 'Բյուջեն չի կարող բացասական լինել'),
});

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const projects = await prisma.weddingProject.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      guests: { select: { id: true, rsvp: true, side: true } },
      expenses: { select: { amount: true, paymentStatus: true } },
      tables: { include: { guests: true } },
      schedule: { select: { id: true, title: true, startTime: true, locationName: true } },
      members: { where: { userId }, select: { role: true } },
    },
    orderBy: { weddingDate: 'asc' },
  });

  res.json(
    projects.map((p) => ({
      ...p,
      totalBudget: Number(p.totalBudget),
      expenses: p.expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
      userRole: p.ownerId === userId ? 'OWNER' : p.members[0]?.role ?? 'VIEWER',
      summary: buildProjectSummary({
        ...p,
        totalBudget: p.totalBudget,
      }),
    }))
  );
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { brideName, groomName, weddingDate, totalBudget } = parsed.data;
  const project = await prisma.weddingProject.create({
    data: {
      brideName,
      groomName,
      weddingDate: new Date(weddingDate),
      totalBudget,
      ownerId: req.user!.id,
      invitation: {
        create: { template: DEFAULT_INVITATION_TEMPLATE },
      },
    },
    include: { invitation: true },
  });

  res.status(201).json({ ...project, totalBudget: Number(project.totalBudget) });
});

router.get('/:projectId', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const projectId = param(req, 'projectId');
  const project = await prisma.weddingProject.findUnique({
    where: { id: projectId },
    include: {
      guests: true,
      expenses: true,
      tables: { include: { guests: { include: { guest: true } } } },
      schedule: { orderBy: { startTime: 'asc' } },
      invitation: true,
      members: { include: { user: { select: { id: true, email: true, name: true } } } },
      owner: { select: { id: true, email: true, name: true } },
    },
  });

  if (!project) return res.status(404).json({ error: 'Նախագիծը չի գտնվել' });

  res.json({
    ...project,
    totalBudget: Number(project.totalBudget),
    expenses: project.expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    summary: buildProjectSummary(project),
    userRole: req.projectRole,
  });
});

router.put('/:projectId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) {
    return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });
  }

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { brideName, groomName, weddingDate, totalBudget } = parsed.data;
  const project = await prisma.weddingProject.update({
    where: { id: param(req, 'projectId') },
    data: {
      brideName,
      groomName,
      weddingDate: new Date(weddingDate),
      totalBudget,
    },
  });

  res.json({ ...project, totalBudget: Number(project.totalBudget) });
});

router.delete('/:projectId', projectAccess('OWNER'), async (req: AuthRequest, res) => {
  await prisma.weddingProject.delete({ where: { id: param(req, 'projectId') } });
  res.json({ message: 'Նախագիծը ջնջված է' });
});

router.get('/:projectId/dashboard', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const project = await prisma.weddingProject.findUnique({
    where: { id: param(req, 'projectId') },
    include: {
      guests: { select: { rsvp: true, side: true } },
      expenses: { select: { amount: true, paymentStatus: true } },
      tables: { include: { guests: true } },
      schedule: { select: { id: true, title: true, startTime: true, locationName: true } },
    },
  });

  if (!project) return res.status(404).json({ error: 'Նախագիծը չի գտնվել' });

  res.json({
    brideName: project.brideName,
    groomName: project.groomName,
    weddingDate: project.weddingDate,
    summary: buildProjectSummary(project),
  });
});

export default router;
