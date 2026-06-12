type GuestName = { firstName: string; lastName: string };

export function formatGuestFullName(guest: GuestName) {
  return [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim();
}

export function formatGuestNames(
  guest: GuestName,
  partner?: GuestName | null,
  familyMembers: GuestName[] = []
) {
  const names = [formatGuestFullName(guest)];
  if (partner) names.push(formatGuestFullName(partner));
  for (const member of familyMembers) {
    names.push(formatGuestFullName(member));
  }

  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} և ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} և ${names[names.length - 1]}`;
}

export function getInviteGuest<T extends { id: string; parentId?: string | null; parent?: { id: string; inviteToken: string } | null }>(
  guest: T,
  guestById: Map<string, T & { inviteToken: string }>
): (T & { inviteToken: string }) | null {
  if (guest.parentId && guest.parent) {
    const parent = guestById.get(guest.parent.id);
    if (parent?.inviteToken) return parent;
  }
  return 'inviteToken' in guest && guest.inviteToken ? (guest as T & { inviteToken: string }) : null;
}
