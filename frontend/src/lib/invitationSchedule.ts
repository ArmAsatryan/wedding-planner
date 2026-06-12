import { formatTime } from './format';
import type { InvitationScheduleItem } from './api';

export function getScheduleMapUrl(item: InvitationScheduleItem) {
  if (item.mapLink) return item.mapLink;
  if (item.latitude != null && item.longitude != null) {
    return `https://maps.google.com/?q=${item.latitude},${item.longitude}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(item.address)}`;
}

export function formatScheduleTimeRange(item: InvitationScheduleItem) {
  const start = formatTime(item.startTime);
  if (!item.endTime) return start;
  return `${start} — ${formatTime(item.endTime)}`;
}
