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

async function getGuestAssignmentGroup(guestId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { id: true, partnerId: true },
  });
  if (!guest) return null;
  return guest.partnerId ? [guest.id, guest.partnerId] : [guest.id];
}

function buildPartnerGroups(guestIds: string[], partnerById: Map<string, string | null>) {
  const groups: string[][] = [];
  const used = new Set<string>();

  for (const id of guestIds) {
    if (used.has(id)) continue;
    const partnerId = partnerById.get(id);
    if (partnerId && guestIds.includes(partnerId) && !used.has(partnerId)) {
      groups.push([id, partnerId]);
      used.add(id);
      used.add(partnerId);
    } else {
      groups.push([id]);
      used.add(id);
    }
  }

  return groups;
}

function chunkGroups(groups: string[][], peoplePerTable: number) {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const group of groups) {
    if (current.length > 0 && current.length + group.length > peoplePerTable) {
      chunks.push(current);
      current = [];
    }
    current.push(...group);
    if (current.length >= peoplePerTable) {
      chunks.push(current);
      current = [];
    }
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

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

  const tableId = param(req, 'tableId');
  const guestIds = await getGuestAssignmentGroup(parsed.data.guestId);
  if (!guestIds) return res.status(404).json({ error: 'Հյուրը չի գտնվել' });

  const table = await prisma.seatingTable.findUnique({
    where: { id: tableId },
    include: { guests: true },
  });
  if (!table) return res.status(404).json({ error: 'Սեղանը չի գտնվել' });

  const seatsNeeded = guestIds.filter(
    (id) => !table.guests.some((assignment) => assignment.guestId === id)
  ).length;

  if (table.guests.length + seatsNeeded > table.capacity) {
    return res.status(400).json({
      error: guestIds.length > 1
        ? 'Սեղանին բավարար տեղ չկա զույգի համար'
        : 'Սեղանը լիքն է',
    });
  }

  await prisma.tableGuest.deleteMany({
    where: { guestId: { in: guestIds } },
  });

  const assignments = await prisma.$transaction(
    guestIds.map((guestId) =>
      prisma.tableGuest.create({
        data: { tableId, guestId },
        include: { guest: true },
      })
    )
  );

  res.status(201).json({
    assignments,
    message: guestIds.length > 1 ? 'Զույգը տեղադրված է սեղանի մոտ' : undefined,
  });
});

router.delete('/:tableId/guests/:guestId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const guestIds = await getGuestAssignmentGroup(param(req, 'guestId'));
  if (!guestIds) return res.status(404).json({ error: 'Հյուրը չի գտնվել' });

  await prisma.tableGuest.deleteMany({
    where: {
      tableId: param(req, 'tableId'),
      guestId: { in: guestIds },
    },
  });
  res.json({ message: 'Հյուրը հանվել է սեղանից' });
});

router.post('/auto-distribute', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = autoDistributeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { guestIds, peoplePerTable } = parsed.data;
  const projectId = param(req, 'projectId');

  const guests = await prisma.guest.findMany({
    where: { id: { in: guestIds }, projectId },
    select: { id: true, side: true, partnerId: true },
  });

  if (guests.length !== guestIds.length) {
    return res.status(400).json({ error: 'Որոշ հյուրեր չեն գտնվել' });
  }

  await prisma.tableGuest.deleteMany({
    where: { guestId: { in: guestIds } },
  });

  const partnerById = new Map(guests.map((g) => [g.id, g.partnerId]));

  const sideGroups = [
    { prefix: 'Հարսի սեղան', ids: guests.filter((g) => g.side === 'BRIDE').map((g) => g.id) },
    { prefix: 'Փեսայի սեղան', ids: guests.filter((g) => g.side === 'GROOM').map((g) => g.id) },
  ];

  const createdTables = [];
  for (const group of sideGroups) {
    if (group.ids.length === 0) continue;

    const partnerGroups = buildPartnerGroups(group.ids, partnerById);
    const chunks = chunkGroups(partnerGroups, peoplePerTable);

    for (let i = 0; i < chunks.length; i++) {
      const table = await prisma.seatingTable.create({
        data: {
          projectId,
          name: `${group.prefix} ${i + 1}`,
          capacity: Math.max(peoplePerTable, chunks[i].length),
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
  }

  res.status(201).json({
    tables: createdTables,
    message: `${createdTables.length} սեղան ստեղծված է (հարսի և փեսայի կողմերով առանձ)` ,
  });
});

export default router;
