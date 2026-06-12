import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { projectAccess, canEdit } from '../middleware/projectAccess.js';
import { param } from '../utils/params.js';
import { buildInvitationPreview } from '../lib/invitation.js';
import { loadGuestHouseholdById } from '../lib/household.js';

const router = Router({ mergeParams: true });

const templateSchema = z.object({
  template: z.string().min(10, 'Հրավերի տեքստը շատ կարճ է'),
  backgroundImage: z.string().nullable().optional(),
});

router.use(authenticate);

router.get('/template', projectAccess('VIEWER'), async (req: AuthRequest, res) => {
  const invitation = await prisma.invitationTemplate.findUnique({
    where: { projectId: param(req, 'projectId') },
  });
  res.json(invitation);
});

router.put('/template', projectAccess('EDITOR'), async (req: AuthRequest, res) => {
  if (!canEdit(req.projectRole)) return res.status(403).json({ error: 'Խմբագրման իրավունք չկա' });

  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

  const projectId = param(req, 'projectId');
  const { template, backgroundImage } = parsed.data;

  const invitation = await prisma.invitationTemplate.upsert({
    where: { projectId },
    create: { projectId, template, backgroundImage: backgroundImage ?? null },
    update: { template, backgroundImage: backgroundImage ?? null },
  });
  res.json(invitation);
});

async function previewInvitations(req: AuthRequest, res: import('express').Response) {
  const project = await prisma.weddingProject.findUnique({
    where: { id: param(req, 'projectId') },
    include: {
      invitation: true,
      schedule: { orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }] },
      guests: {
        include: {
          partner: { select: { firstName: true, lastName: true } },
          children: { select: { firstName: true, lastName: true }, orderBy: { firstName: 'asc' } },
        },
      },
    },
  });
  if (!project?.invitation) return res.status(404).json({ error: 'Հրավերի կաղապար չի գտնվել' });

  const guestId = param(req, 'guestId');
  let guests = project.guests;
  if (guestId && guestId !== 'all') {
    guests = guests.filter((g) => g.id === guestId);
    if (!guests.length) return res.status(404).json({ error: 'Հյուրը չի գտնվել' });
  }

  const previews = await Promise.all(
    guests.map(async (guest) => {
      const household = await loadGuestHouseholdById(guest.id);
      if (!household) return null;
      return buildInvitationPreview(
        { ...household.primary, inviteToken: guest.inviteToken },
        project,
        project.invitation!,
        household.partner,
        project.schedule,
        household.children
      );
    })
  );

  res.json({
    previews: previews.filter(Boolean),
    template: project.invitation.template,
    backgroundImage: project.invitation.backgroundImage,
  });
}

router.get('/preview', projectAccess('VIEWER'), previewInvitations);
router.get('/preview/:guestId', projectAccess('VIEWER'), previewInvitations);

export default router;
