import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const optionalName = z.string().optional().transform((value) => value?.trim() ?? '');

const guestSchema = z.object({
  firstName: z.string().trim().min(1, 'Անունը պարտադիր է'),
  lastName: optionalName,
  phone: z.string().optional(),
  side: z.enum(['BRIDE', 'GROOM']),
  rsvp: z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'PENDING']).optional(),
  notes: z.string().optional(),
});

const spouseSchema = z.object({
  firstName: z.string().trim().min(1, 'Ամուսնու/կնոջի անունը պարտադիր է'),
  lastName: optionalName,
  phone: z.string().optional(),
  rsvp: z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'PENDING']).optional(),
  notes: z.string().optional(),
});

const familyMemberSchema = z.object({
  firstName: z.string().trim().min(1, 'Ընտանիքի անդամի անունը պարտադիր է'),
  lastName: optionalName,
  notes: z.string().optional(),
});

const createGuestSchema = guestSchema.extend({
  spouse: spouseSchema.optional(),
  familyMembers: z.array(familyMemberSchema).optional(),
});

const guestInclude = {
  tableAssignments: { include: { table: true } },
  partner: { select: { id: true, firstName: true, lastName: true } },
  parent: { select: { id: true, firstName: true, lastName: true, inviteToken: true } },
  children: {
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: 'asc' as const },
  },
};

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const guests = await prisma.guest.findMany({
    where: { projectId: param(req, 'projectId') },
    include: guestInclude,
    orderBy: [{ side: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
  });

  const brideCount = guests.filter((g) => g.side === 'BRIDE').length;
  const groomCount = guests.filter((g) => g.side === 'GROOM').length;

  res.json({ guests, stats: { total: guests.length, bride: brideCount, groom: groomCount } });
});

router.post('/', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = createGuestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { spouse, familyMembers = [], ...guestData } = parsed.data;
  const projectId = param(req, 'projectId');

  if (!spouse && familyMembers.length === 0) {
    const guest = await prisma.guest.create({
      data: { ...guestData, projectId },
    });
    return res.status(201).json({ guest });
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdGuest = await tx.guest.create({ data: { ...guestData, projectId } });
    let spouseGuest = null;

    if (spouse) {
      spouseGuest = await tx.guest.create({
        data: {
          ...spouse,
          side: guestData.side,
          rsvp: spouse.rsvp ?? guestData.rsvp,
          partnerId: createdGuest.id,
          projectId,
        },
      });
      await tx.guest.update({
        where: { id: createdGuest.id },
        data: { partnerId: spouseGuest.id },
      });
    }

    const createdFamilyMembers = [];
    for (const member of familyMembers) {
      const child = await tx.guest.create({
        data: {
          ...member,
          side: guestData.side,
          rsvp: guestData.rsvp,
          parentId: createdGuest.id,
          projectId,
        },
      });
      createdFamilyMembers.push(child);
    }

    const guest = await tx.guest.findUniqueOrThrow({
      where: { id: createdGuest.id },
      include: guestInclude,
    });

    return { guest, spouse: spouseGuest, familyMembers: createdFamilyMembers };
  });

  res.status(201).json(result);
});

router.put('/:guestId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = guestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const guest = await prisma.guest.update({
    where: { id: param(req, 'guestId') },
    data: parsed.data,
  });
  res.json(guest);
});

router.delete('/:guestId', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  await prisma.guest.delete({ where: { id: param(req, 'guestId') } });
  res.json({ message: 'Հյուրը ջնջված է' });
});

export default router;
