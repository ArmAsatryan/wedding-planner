import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { buildInvitationPreview } from '../lib/invitation.js';

const router = Router();

router.get('/:token', async (req, res) => {
  const guest = await prisma.guest.findUnique({
    where: { inviteToken: req.params.token },
    include: {
      partner: { select: { firstName: true, lastName: true } },
      project: {
        include: {
          invitation: true,
          schedule: { orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }] },
        },
      },
    },
  });

  if (!guest?.project.invitation) {
    return res.status(404).json({ error: 'Հրավերը չի գտնվել' });
  }

  const preview = buildInvitationPreview(
    guest,
    guest.project,
    guest.project.invitation,
    guest.partner,
    guest.project.schedule
  );
  res.json(preview);
});

export default router;
