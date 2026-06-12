import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildInvitationPreview } from '../lib/invitation.js';
import { loadGuestHouseholdByToken } from '../lib/household.js';

const router = Router();

router.get('/:token', async (req, res) => {
  const household = await loadGuestHouseholdByToken(req.params.token);

  if (!household) {
    return res.status(404).json({ error: 'Հրավերը չի գտնվել' });
  }

  const primaryGuest = await prisma.guest.findUnique({
    where: { id: household.primary.id },
    select: { projectId: true },
  });

  if (!primaryGuest) {
    return res.status(404).json({ error: 'Հրավերը չի գտնվել' });
  }

  const project = await prisma.weddingProject.findUnique({
    where: { id: primaryGuest.projectId },
    include: {
      invitation: true,
      schedule: { orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }] },
    },
  });

  if (!project?.invitation) {
    return res.status(404).json({ error: 'Հրավերը չի գտնվել' });
  }

  const preview = buildInvitationPreview(
    { ...household.primary, inviteToken: household.inviteToken },
    project,
    project.invitation,
    household.partner,
    project.schedule,
    household.children
  );
  res.json(preview);
});

export default router;
