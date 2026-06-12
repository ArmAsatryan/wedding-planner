import { prisma } from '../src/lib/prisma.js';
import { randomBytes } from 'crypto';

function createToken() {
  return randomBytes(12).toString('base64url');
}

async function main() {
  const guests = await prisma.guest.findMany({
    where: { inviteToken: null },
    select: { id: true },
  });

  for (const guest of guests) {
    await prisma.guest.update({
      where: { id: guest.id },
      data: { inviteToken: createToken() },
    });
  }

  console.log(`Backfilled inviteToken for ${guests.length} guest(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
