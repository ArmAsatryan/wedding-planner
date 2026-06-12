type GuestName = { firstName: string; lastName: string };

export function formatGuestFullName(guest: GuestName) {
  return `${guest.firstName} ${guest.lastName}`;
}

export function formatGuestNames(guest: GuestName, partner?: GuestName | null) {
  const primary = formatGuestFullName(guest);
  if (!partner) return primary;
  return `${primary} և ${formatGuestFullName(partner)}`;
}
