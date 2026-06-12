import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';

const router = Router({ mergeParams: true });

const guestSchema = z.object({
  firstName: z.string().min(1, 'Անունը պարտադիր է'),
  lastName: z.string().min(1, 'Ազգանունը պարտադիր է'),
  phone: z.string().optional(),
  side: z.enum(['BRIDE', 'GROOM']),
  rsvp: z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'PENDING']).optional(),
  notes: z.string().optional(),
});

const spouseSchema = z.object({
  firstName: z.string().min(1, 'Ամուսնու/կնոջի անունը պարտադիր է'),
  lastName: z.string().min(1, 'Ամուսնու/կնոջի ազգանունը պարտադիր է'),
  phone: z.string().optional(),
  rsvp: z.enum(['INVITED', 'CONFIRMED', 'DECLINED', 'PENDING']).optional(),
  notes: z.string().optional(),
});

const createGuestSchema = guestSchema.extend({
  spouse: spouseSchema.optional(),
});

router.use(authenticate);

router.get('/', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const guests = await prisma.guest.findMany({
    where: { projectId: param(req, 'projectId') },
    include: {
      tableAssignments: { include: { table: true } },
      partner: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: [{ side: 'asc' }, { lastName: 'asc' }],
  });

  const brideCount = guests.filter((g) => g.side === 'BRIDE').length;
  const groomCount = guests.filter((g) => g.side === 'GROOM').length;

  res.json({ guests, stats: { total: guests.length, bride: brideCount, groom: groomCount } });
});

router.post('/', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = createGuestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const { spouse, ...guestData } = parsed.data;
  const projectId = param(req, 'projectId');

  if (!spouse) {
    const guest = await prisma.guest.create({
      data: { ...guestData, projectId },
    });
    return res.status(201).json({ guest });
  }

  const [guest, spouseGuest] = await prisma.$transaction(async (tx) => {
    const createdGuest = await tx.guest.create({ data: { ...guestData, projectId } });
    const createdSpouse = await tx.guest.create({
      data: {
        ...spouse,
        side: guestData.side,
        rsvp: spouse.rsvp ?? guestData.rsvp,
        partnerId: createdGuest.id,
        projectId,
      },
    });
    const linkedGuest = await tx.guest.update({
      where: { id: createdGuest.id },
      data: { partnerId: createdSpouse.id },
    });
    return [linkedGuest, createdSpouse] as const;
  });

  res.status(201).json({ guest, spouse: spouseGuest });
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
