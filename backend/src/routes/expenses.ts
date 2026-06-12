import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const expenseCategories = [
  'RESTAURANT_VENUE', 'DJ', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'FLOWERS',
  'WEDDING_DRESS', 'GROOM_SUIT', 'RINGS', 'INVITATIONS', 'TAROSIK',
  'FURSHET', 'CAKE', 'DECORATION', 'TRANSPORT', 'OTHER',
] as const;

const expenseSchema = z.object({
  name: z.string().min(1, 'Անվանումը պարտադիր է'),
  category: z.enum(expenseCategories),
  amount: z.number().min(0, 'Գումարը չի կարող բացասական լինել'),
  paymentStatus: z.enum(['PAID', 'UNPAID']).optional(),
  description: z.string().optional(),
});

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const [expenses, project] = await Promise.all([
    prisma.expense.findMany({
      where: { projectId: param(req, 'projectId') },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.weddingProject.findUnique({ where: { id: param(req, 'projectId') } }),
  ]);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const paid = expenses.filter((e) => e.paymentStatus === 'PAID').reduce((s, e) => s + Number(e.amount), 0);
  const unpaid = total - paid;
  const budget = Number(project?.totalBudget ?? 0);

  res.json({
    expenses: expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    stats: {
      total,
      paid,
      unpaid,
      remainingBudget: budget - total,
      exceedsBudget: total > budget,
    },
  });
});

router.post('/', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const expense = await prisma.expense.create({
    data: { ...parsed.data, projectId: param(req, 'projectId') },
  });
  res.status(201).json({ ...expense, amount: Number(expense.amount) });
});

router.put('/:expenseId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const expense = await prisma.expense.update({
    where: { id: param(req, 'expenseId') },
    data: parsed.data,
  });
  res.json({ ...expense, amount: Number(expense.amount) });
});

router.delete('/:expenseId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  await prisma.expense.delete({ where: { id: param(req, 'expenseId') } });
  res.json({ message: 'Ծախսը ջնջված է' });
});

export default router;
