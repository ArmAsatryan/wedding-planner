import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const tableSchema = z.object({
  name: z.string().min(1, 'Սեղանի անունը պարտադիր է'),
  capacity: z.number().int().min(1, 'Տեղերի քանակը պետք է լինի առնվազն 1'),
});

const assignSchema = z.object({
  guestId: z.string(),
});

const autoDistributeSchema = z.object({
  guestIds: z.array(z.string()).min(1, 'Ընտրեք առնվազն մեկ հյուր'),
  peoplePerTable: z.number().int().min(1, 'Տեղերի քանակը պետք է լինի առնվազն 1'),
  tableNamePrefix: z.string().optional(),
});

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const tables = await prisma.seatingTable.findMany({
    where: { projectId: param(req, 'projectId') },
    include: { guests: { include: { guest: true } } },
    orderBy: { name: 'asc' },
  });

  const allGuests = await prisma.guest.findMany({
    where: { projectId: param(req, 'projectId') },
    include: { tableAssignments: true },
  });

  const assignedIds = new Set(allGuests.filter((g) => g.tableAssignments.length > 0).map((g) => g.id));
  const unassignedGuests = allGuests.filter((g) => !assignedIds.has(g.id));

  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
  const occupiedSeats = tables.reduce((s, t) => s + t.guests.length, 0);

  res.json({
    tables,
    unassignedGuests,
    stats: {
      tableCount: tables.length,
      totalSeats,
      occupiedSeats,
      emptySeats: totalSeats - occupiedSeats,
      unassignedCount: unassignedGuests.length,
    },
  });
});

router.post('/', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const table = await prisma.seatingTable.create({
    data: { ...parsed.data, projectId: param(req, 'projectId') },
    include: { guests: { include: { guest: true } } },
  });
  res.status(201).json(table);
});

router.put('/:tableId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = tableSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const table = await prisma.seatingTable.update({
    where: { id: param(req, 'tableId') },
    data: parsed.data,
    include: { guests: { include: { guest: true } } },
  });
  res.json(table);
});

router.delete('/:tableId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  await prisma.seatingTable.delete({ where: { id: param(req, 'tableId') } });
  res.json({ message: 'Սեղանը ջնջված է' });
});

router.post('/:tableId/assign', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const table = await prisma.seatingTable.findUnique({
    where: { id: param(req, 'tableId') },
    include: { guests: true },
  });
  if (!table) return res.status(404).json({ error: 'Սեղանը չի գտնվել' });
  if (table.guests.length >= table.capacity) {
    return res.status(400).json({ error: 'Սեղանը լիքն է' });
  }

  const existing = await prisma.tableGuest.findUnique({ where: { guestId: parsed.data.guestId } });
  if (existing) {
    await prisma.tableGuest.delete({ where: { id: existing.id } });
  }

  const assignment = await prisma.tableGuest.create({
    data: { tableId: param(req, 'tableId'), guestId: parsed.data.guestId },
    include: { guest: true },
  });
  res.status(201).json(assignment);
});

router.delete('/:tableId/guests/:guestId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  await prisma.tableGuest.deleteMany({
    where: { tableId: param(req, 'tableId'), guestId: param(req, 'guestId') },
  });
  res.json({ message: 'Հյուրը հանվել է սեղանից' });
});

router.post('/auto-distribute', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = autoDistributeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { guestIds, peoplePerTable, tableNamePrefix = 'Սեղան' } = parsed.data;
  const projectId = param(req, 'projectId');

  await prisma.tableGuest.deleteMany({
    where: { guestId: { in: guestIds } },
  });

  const chunks: string[][] = [];
  for (let i = 0; i < guestIds.length; i += peoplePerTable) {
    chunks.push(guestIds.slice(i, i + peoplePerTable));
  }

  const createdTables = [];
  for (let i = 0; i < chunks.length; i++) {
    const table = await prisma.seatingTable.create({
      data: {
        projectId,
        name: `${tableNamePrefix} ${i + 1}`,
        capacity: peoplePerTable,
      },
    });
    for (const guestId of chunks[i]) {
      await prisma.tableGuest.create({ data: { tableId: table.id, guestId } });
    }
    const full = await prisma.seatingTable.findUnique({
      where: { id: table.id },
      include: { guests: { include: { guest: true } } },
    });
    createdTables.push(full);
  }

  res.status(201).json({ tables: createdTables, message: `${chunks.length} սեղան ստեղծված է` });
});

export default router;
