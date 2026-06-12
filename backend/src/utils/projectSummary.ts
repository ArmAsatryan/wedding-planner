import { Prisma } from '@prisma/client';

type ProjectWithRelations = {
  totalBudget: Prisma.Decimal;
  guests: { rsvp: string; side: string }[];
  expenses: { amount: Prisma.Decimal; paymentStatus: string }[];
  tables: { capacity: number; guests: unknown[] }[];
  schedule: { startTime: Date; title: string; id: string; locationName: string }[];
};

export function buildProjectSummary(project: ProjectWithRelations) {
  const totalBudget = Number(project.totalBudget);
  const totalExpenses = project.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const paidExpenses = project.expenses
    .filter((e) => e.paymentStatus === 'PAID')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const unpaidExpenses = totalExpenses - paidExpenses;
  const remainingBudget = totalBudget - totalExpenses;

  const totalGuests = project.guests.length;
  const confirmedGuests = project.guests.filter((g) => g.rsvp === 'CONFIRMED').length;
  const brideGuests = project.guests.filter((g) => g.side === 'BRIDE').length;
  const groomGuests = project.guests.filter((g) => g.side === 'GROOM').length;

  const assignedGuestIds = new Set(
    project.tables.flatMap((t) => (t.guests as { guestId: string }[]).map((g) => g.guestId))
  );
  const totalSeats = project.tables.reduce((sum, t) => sum + t.capacity, 0);
  const occupiedSeats = project.tables.reduce((sum, t) => sum + t.guests.length, 0);
  const emptySeats = totalSeats - occupiedSeats;
  const unassignedGuests = totalGuests - assignedGuestIds.size;

  const now = new Date();
  const upcomingSchedule = project.schedule
    .filter((s) => s.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, 5);

  return {
    budget: {
      total: totalBudget,
      used: totalExpenses,
      remaining: remainingBudget,
      exceedsBudget: totalExpenses > totalBudget,
    },
    expenses: {
      total: totalExpenses,
      paid: paidExpenses,
      unpaid: unpaidExpenses,
    },
    guests: {
      total: totalGuests,
      confirmed: confirmedGuests,
      bride: brideGuests,
      groom: groomGuests,
    },
    tables: {
      count: project.tables.length,
      totalSeats,
      occupiedSeats,
      emptySeats,
      unassignedGuests,
    },
    upcomingSchedule,
  };
}
