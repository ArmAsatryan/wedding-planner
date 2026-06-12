export function getGuestInviteUrl(inviteToken: string) {
  return `${window.location.origin}/invite/${inviteToken}`;
}
