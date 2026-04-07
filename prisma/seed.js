const { PrismaClient, UserRole } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const agency = await prisma.agency.upsert({
    where: { slug: 'ohio-attorney-general' },
    update: {},
    create: {
      slug: 'ohio-attorney-general',
      name: 'Ohio Attorney General',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'dev@police-ohio.local' },
    update: { agencyId: agency.id },
    create: {
      email: 'dev@police-ohio.local',
      name: 'Development User',
      role: UserRole.ADMIN,
      agencyId: agency.id,
    },
  });

  const title = await prisma.orcTitle.upsert({
    where: { titleNumber: '29' },
    update: {},
    create: {
      titleNumber: '29',
      slug: 'title-29-crimes-procedure',
      name: 'Crimes-Procedure',
      tags: ['seed', 'development'],
      aliases: ['ORC 29'],
      sourceHash: 'seed-title-29',
      contentVersion: 1,
      ingestedAt: new Date(),
    },
  });

  const chapter = await prisma.orcChapter.upsert({
    where: {
      titleId_chapterNumber: {
        titleId: title.id,
        chapterNumber: '2933',
      },
    },
    update: {},
    create: {
      titleId: title.id,
      chapterNumber: '2933',
      slug: 'weapons-control',
      name: 'Weapons Control',
      tags: ['firearms'],
      aliases: ['Weapons'],
      sourceHash: 'seed-chapter-2933',
      contentVersion: 1,
      ingestedAt: new Date(),
    },
  });

  const pinnedSections = [
    {
      sectionNumber: '2933.12',
      slug: 'carrying-concealed-weapons',
      heading: 'Carrying concealed weapons.',
    },
    {
      sectionNumber: '2933.16',
      slug: 'improperly-handling-firearms-in-a-motor-vehicle',
      heading: 'Improperly handling firearms in a motor vehicle.',
    },
  ];

  for (const [index, seedSection] of pinnedSections.entries()) {
    const section = await prisma.orcSection.upsert({
      where: {
        chapterId_sectionNumber: {
          chapterId: chapter.id,
          sectionNumber: seedSection.sectionNumber,
        },
      },
      update: {},
      create: {
        titleId: title.id,
        chapterId: chapter.id,
        sectionNumber: seedSection.sectionNumber,
        slug: seedSection.slug,
        heading: seedSection.heading,
        bodyText: 'Seed scaffold content for local development.',
        tags: ['pinned', 'seed'],
        aliases: [seedSection.sectionNumber],
        parsedNodes: { type: 'doc', content: [] },
        renderBlocks: [],
        sourceHash: `seed-section-${seedSection.sectionNumber}`,
        contentVersion: 1,
        ingestedAt: new Date(),
      },
    });

    await prisma.favorite.upsert({
      where: {
        userId_sectionId: {
          userId: user.id,
          sectionId: section.id,
        },
      },
      update: { pinned: true, pinOrder: index },
      create: {
        userId: user.id,
        sectionId: section.id,
        pinned: true,
        pinOrder: index,
        note: 'Pinned by seed script scaffold.',
      },
    });
  }

  await prisma.searchHistory.create({
    data: {
      userId: user.id,
      query: 'concealed carry training',
      filters: { title: '29', chapter: '2933' },
      resultMeta: { totalHits: 2, sectionNumbers: pinnedSections.map((s) => s.sectionNumber) },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
