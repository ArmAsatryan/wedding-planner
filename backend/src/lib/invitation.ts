type GuestName = { firstName: string; lastName: string };

export type InvitationScheduleItem = {
  title: string;
  startTime: Date;
  endTime?: Date | null;
  locationName: string;
  address: string;
  mapLink?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

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

export function formatInvitationDate(date: Date) {
  return date.toLocaleDateString('hy-AM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatScheduleTime(startTime: Date, endTime?: Date | null) {
  const start = startTime.toLocaleTimeString('hy-AM', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!endTime) return start;
  const end = endTime.toLocaleTimeString('hy-AM', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${start} — ${end}`;
}

export function formatScheduleText(schedule: InvitationScheduleItem[]) {
  if (!schedule.length) return '';

  return schedule
    .map((item) => {
      const time = formatScheduleTime(item.startTime, item.endTime);
      const location =
        item.locationName === item.address
          ? item.locationName
          : `${item.locationName}, ${item.address}`;
      return `${time} — ${item.title}\n${location}`;
    })
    .join('\n\n');
}

export function serializeScheduleItem(item: InvitationScheduleItem) {
  return {
    title: item.title,
    startTime: item.startTime.toISOString(),
    endTime: item.endTime?.toISOString() ?? null,
    locationName: item.locationName,
    address: item.address,
    mapLink: item.mapLink ?? null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
  };
}

export function renderInvitation(
  template: string,
  guest: GuestName,
  project: { brideName: string; groomName: string; weddingDate: Date },
  partner?: GuestName | null,
  schedule: InvitationScheduleItem[] = [],
  familyMembers: GuestName[] = []
) {
  const guestName = formatGuestNames(guest, partner, familyMembers);
  const scheduleText = formatScheduleText(schedule);

  return template
    .replace(/\{\{guestName\}\}/g, guestName)
    .replace(/\{\{brideName\}\}/g, project.brideName)
    .replace(/\{\{groomName\}\}/g, project.groomName)
    .replace(/\{\{weddingDate\}\}/g, formatInvitationDate(project.weddingDate))
    .replace(/\{\{schedule\}\}/g, scheduleText);
}

export function buildInvitationPreview(
  guest: { id: string; firstName: string; lastName: string; inviteToken: string },
  project: { brideName: string; groomName: string; weddingDate: Date },
  invitation: { template: string; backgroundImage: string | null },
  partner?: GuestName | null,
  schedule: InvitationScheduleItem[] = [],
  familyMembers: GuestName[] = []
) {
  const guestName = formatGuestNames(guest, partner, familyMembers);
  return {
    guestId: guest.id,
    guestName,
    partnerName: partner ? formatGuestFullName(partner) : null,
    inviteToken: guest.inviteToken,
    content: renderInvitation(invitation.template, guest, project, partner, schedule, familyMembers),
    brideName: project.brideName,
    groomName: project.groomName,
    weddingDate: project.weddingDate,
    backgroundImage: invitation.backgroundImage,
    schedule: schedule.map(serializeScheduleItem),
  };
}
