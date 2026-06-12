import { prisma } from './prisma.js';

const nameSelect = { firstName: true, lastName: true } as const;

const householdInclude = {
  partner: { select: { id: true, ...nameSelect } },
  children: { select: nameSelect, orderBy: { firstName: 'asc' as const } },
  parent: {
    select: {
      id: true,
      inviteToken: true,
      ...nameSelect,
      partner: { select: { id: true, ...nameSelect } },
      children: { select: nameSelect, orderBy: { firstName: 'asc' as const } },
    },
  },
};

export async function loadGuestHouseholdByToken(token: string) {
  const guest = await prisma.guest.findUnique({
    where: { inviteToken: token },
    include: householdInclude,
  });

  if (!guest) return null;

  return resolveHousehold(guest);
}

export async function loadGuestHouseholdById(guestId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: householdInclude,
  });

  if (!guest) return null;

  return resolveHousehold(guest);
}

async function resolveHousehold(
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    inviteToken: string;
    parentId: string | null;
    partnerId: string | null;
    partner: { id: string; firstName: string; lastName: string } | null;
    children: { firstName: string; lastName: string }[];
    parent: {
      id: string;
      firstName: string;
      lastName: string;
      inviteToken: string;
      partner: { id: string; firstName: string; lastName: string } | null;
      children: { firstName: string; lastName: string }[];
    } | null;
  }
) {
  if (guest.parent) {
    return {
      primary: guest.parent,
      partner: guest.parent.partner,
      children: guest.parent.children,
      inviteToken: guest.inviteToken,
    };
  }

  if (guest.partnerId && guest.children.length === 0) {
    const partnerGuest = await prisma.guest.findUnique({
      where: { id: guest.partnerId },
      include: {
        partner: { select: { id: true, ...nameSelect } },
        children: { select: nameSelect, orderBy: { firstName: 'asc' } },
      },
    });

    if (partnerGuest?.children.length) {
      return {
        primary: partnerGuest,
        partner: guest,
        children: partnerGuest.children,
        inviteToken: guest.inviteToken,
      };
    }
  }

  return {
    primary: guest,
    partner: guest.partner,
    children: guest.children,
    inviteToken: guest.inviteToken,
  };
}
