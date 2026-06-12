import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const scheduleSchema = z.object({
  title: z.string().min(1, 'Վերնագիրը պարտադիր է'),
  startTime: z.string().min(1),
  endTime: z.string().optional().nullable(),
  locationName: z.string().min(1, 'Վայրի անունը պարտադիր է'),
  address: z.string().min(1, 'Հասցեն պարտադիր է'),
  description: z.string().optional(),
  mapLink: z.string().url().optional().or(z.literal('')),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

function toScheduleDateTime(value: string, field: 'startTime' | 'endTime') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(field === 'startTime' ? 'Սկզբի ժամանակը սխալ է' : 'Ավարտի ժամանակը սխալ է');
  }
  return date;
}

function buildScheduleData(parsed: z.infer<typeof scheduleSchema>) {
  const { endTime, mapLink, startTime, ...rest } = parsed;
  const start = toScheduleDateTime(startTime, 'startTime');
  const end = endTime ? toScheduleDateTime(endTime, 'endTime') : null;

  if (end && end <= start) {
    throw new Error('Ավարտի ժամը պետք է լինի սկզբի ժամից հետո');
  }

  return {
    ...rest,
    startTime: start,
    endTime: end,
    mapLink: mapLink || null,
  };
}

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const items = await prisma.scheduleItem.findMany({
    where: { projectId: param(req, 'projectId') },
    orderBy: { startTime: 'asc' },
  });
  res.json(items);
});

router.post('/', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const item = await prisma.scheduleItem.create({
      data: {
        ...buildScheduleData(parsed.data),
        projectId: param(req, 'projectId'),
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof Error && err.message.includes('ժամ')) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.put('/:itemId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  try {
    const item = await prisma.scheduleItem.update({
      where: { id: param(req, 'itemId') },
      data: buildScheduleData(parsed.data),
    });
    res.json(item);
  } catch (err) {
    if (err instanceof Error && err.message.includes('ժամ')) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
});

router.delete('/:itemId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  await prisma.scheduleItem.delete({ where: { id: param(req, 'itemId') } });
  res.json({ message: 'Ժամանակացույցի կետը ջնջված է' });
});

export default router;
