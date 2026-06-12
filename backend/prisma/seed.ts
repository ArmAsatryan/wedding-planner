import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_INVITATION_TEMPLATE } from '../src/lib/constants.js';

const prisma = new PrismaClient();

async function main() {
  await prisma.tableGuest.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.seatingTable.deleteMany();
  await prisma.scheduleItem.deleteMany();
  await prisma.invitationTemplate.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.weddingProject.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const owner = await prisma.user.create({
    data: {
      email: 'demo@wedding.am',
      passwordHash,
      name: 'Արմեն Ասատրյան',
    },
  });

  const editor = await prisma.user.create({
    data: {
      email: 'editor@wedding.am',
      passwordHash,
      name: 'Գոռ Հակոբյան',
    },
  });

  const weddingDate = new Date('2026-09-15T16:00:00');

  const project = await prisma.weddingProject.create({
    data: {
      brideName: 'Անի',
      groomName: 'Արմեն',
      weddingDate,
      totalBudget: 5000000,
      ownerId: owner.id,
      invitation: { create: { template: DEFAULT_INVITATION_TEMPLATE } },
    },
  });

  await prisma.projectMember.create({
    data: { projectId: project.id, userId: editor.id, role: 'EDITOR' },
  });

  const brideGuests = [
    { firstName: 'Մարիամ', lastName: 'Պետրոսյան', phone: '+37491111111', rsvp: 'CONFIRMED' as const },
    { firstName: 'Լիլիթ', lastName: 'Ավետիսյան', phone: '+37492222222', rsvp: 'CONFIRMED' as const },
    { firstName: 'Նարե', lastName: 'Գրիգորյան', rsvp: 'PENDING' as const },
    { firstName: 'Սոնա', lastName: 'Մկրտչյան', rsvp: 'INVITED' as const },
  ];

  const groomGuests = [
    { firstName: 'Դավիթ', lastName: 'Հովհաննիսյան', phone: '+37493333333', rsvp: 'CONFIRMED' as const },
    { firstName: 'Տիգրան', lastName: 'Սահակյան', rsvp: 'CONFIRMED' as const },
    { firstName: 'Վահե', lastName: 'Խաչատրյան', rsvp: 'DECLINED' as const },
    { firstName: 'Արթուր', lastName: 'Բաբայան', rsvp: 'PENDING' as const },
  ];

  const guests = await Promise.all([
    ...brideGuests.map((g) =>
      prisma.guest.create({ data: { ...g, side: 'BRIDE', projectId: project.id } })
    ),
    ...groomGuests.map((g) =>
      prisma.guest.create({ data: { ...g, side: 'GROOM', projectId: project.id } })
    ),
  ]);

  const expenses = [
    { name: 'Գրանդ Հոլդեն', category: 'RESTAURANT_VENUE' as const, amount: 2000000, paymentStatus: 'PAID' as const },
    { name: 'DJ Mix Studio', category: 'DJ' as const, amount: 350000, paymentStatus: 'PAID' as const },
    { name: 'Photo Art', category: 'PHOTOGRAPHER' as const, amount: 450000, paymentStatus: 'UNPAID' as const },
    { name: 'Flora Design', category: 'FLOWERS' as const, amount: 280000, paymentStatus: 'UNPAID' as const },
    { name: 'Հարսի հագուստ', category: 'WEDDING_DRESS' as const, amount: 600000, paymentStatus: 'PAID' as const },
    { name: 'Տորթ', category: 'CAKE' as const, amount: 150000, paymentStatus: 'UNPAID' as const },
  ];

  await Promise.all(
    expenses.map((e) => prisma.expense.create({ data: { ...e, projectId: project.id } }))
  );

  const table1 = await prisma.seatingTable.create({
    data: { projectId: project.id, name: 'Սեղան 1', capacity: 4 },
  });
  const table2 = await prisma.seatingTable.create({
    data: { projectId: project.id, name: 'Սեղան 2', capacity: 4 },
  });

  await prisma.tableGuest.createMany({
    data: [
      { tableId: table1.id, guestId: guests[0].id },
      { tableId: table1.id, guestId: guests[1].id },
      { tableId: table2.id, guestId: guests[4].id },
      { tableId: table2.id, guestId: guests[5].id },
    ],
  });

  const baseDate = new Date('2026-09-15');
  const scheduleItems = [
    { title: 'Հարսի պատրաստություն', start: '10:00', end: '12:00', location: 'Հարսի տուն', address: 'Երևան, Աբովյան 10' },
    { title: 'Փեսայի պատրաստություն', start: '11:00', end: '12:30', location: 'Փեսայի տուն', address: 'Երևան, Բաղրամյան 25' },
    { title: 'Եկեղեցու արարողություն', start: '14:00', end: '15:30', location: 'Սուրբ Գայանե', address: 'Էջմիածին', mapLink: 'https://maps.google.com/?q=Ejmiatsin' },
    { title: 'Լուսանկարահանում', start: '16:00', end: '17:30', location: 'Կասկադ', address: 'Երևան, Թամանյան' },
    { title: 'Ռեստորանի մուտք', start: '18:00', location: 'Գրանդ Հոլդեն', address: 'Երևան, Ամիրյան 1' },
    { title: 'Առաջին պար', start: '20:00', location: 'Գրանդ Հոլդեն', address: 'Երևան, Ամիրյան 1' },
    { title: 'Տորթի կտրման արարողություն', start: '22:00', location: 'Գրանդ Հոլդեն', address: 'Երևան, Ամիրյան 1' },
    { title: 'Միջոցառման ավարտ', start: '23:30', location: 'Գրանդ Հոլդեն', address: 'Երևան, Ամիրյան 1' },
  ];

  for (let i = 0; i < scheduleItems.length; i++) {
    const item = scheduleItems[i];
    const [sh, sm] = item.start.split(':').map(Number);
    const startTime = new Date(baseDate);
    startTime.setHours(sh, sm, 0, 0);

    let endTime: Date | null = null;
    if (item.end) {
      const [eh, em] = item.end.split(':').map(Number);
      endTime = new Date(baseDate);
      endTime.setHours(eh, em, 0, 0);
    }

    await prisma.scheduleItem.create({
      data: {
        projectId: project.id,
        title: item.title,
        startTime,
        endTime,
        locationName: item.location,
        address: item.address,
        mapLink: item.mapLink ?? null,
        sortOrder: i,
      },
    });
  }

  console.log('✅ Demo տվյալները ստեղծված են');
  console.log('   Էլ. փոստ: demo@wedding.am');
  console.log('   Գաղտնաբառ: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
