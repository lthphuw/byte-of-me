import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --- USER ---
  const user = await prisma.user.upsert({
    where: { email: 'lthphuw@gmail.com' },
    update: {},
    create: {
      name: 'Luong Thanh Hoang Phu',
      firstName: 'Phu',
      lastName: 'Luong',
      email: 'lthphuw@gmail.com',
      github: 'https://github.com/hoangphu1201',
      portfolio: 'https://phu-lth.space',
      bio: 'A passionate fullstack developer',
      quote: 'Build things that matter.',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
      bannerImages: {
        create: [
          {
            src: '/images/banner-1.jpeg',
            caption: `Captured at the Vietnam Military History Museum, this 2024 photo is titled 'Sống bám đá, chết hóa đá.' - 'Live clinging to stone, die turning to stone.'`,
          },
          {
            src: '/images/banner-2.jpeg',
            caption: `Taken at Ba Đình Square, Hanoi, in 2024.`,
          },
          {
            src: '/images/banner-3.jpeg',
            caption: `Presented the first scientific paper on 'Anomaly Detection in Medical Images Using Language-Vision Models' at the CV4DC 2024 workshop.`,
          },
        ],
      },
    },
    include: { bannerImages: true },
  });

  // --- TECH STACKS ---
  const techStacks = await prisma.techStack.createMany({
    data: [
      { name: 'TypeScript', group: 'Language', userId: user.id },
      { name: 'NestJS', group: 'Backend', userId: user.id },
      { name: 'Next.js', group: 'Frontend', userId: user.id },
      { name: 'PostgreSQL', group: 'Database', userId: user.id },
      { name: 'Docker', group: 'DevOps', userId: user.id },
    ],
  });

  const ts = await prisma.techStack.findFirst({ where: { name: 'TypeScript' } });
  const nx = await prisma.techStack.findFirst({ where: { name: 'Next.js' } });
  const ns = await prisma.techStack.findFirst({ where: { name: 'NestJS' } });

  // --- TAGS ---
  const tagReact = await prisma.tag.create({ data: { name: 'React' } });
  const tagPrisma = await prisma.tag.create({ data: { name: 'Prisma' } });
  const tagPortfolio = await prisma.tag.create({ data: { name: 'Portfolio' } });

  // --- PROJECTS ---
  const projectPortfolio = await prisma.project.create({
    data: {
      userId: user.id,
      title: 'Personal Portfolio - Byte of Me',
      description: `A full-stack portfolio with a free-tier AI assistant powered by a RAG pipeline. Explore my projects and skills through natural language queries, with support for i18n, dark/light mode, and responsive design.`,
      githubLink: 'https://github.com/lthphuw/byte-of-me',
      liveLink: 'https://phu-lth.space',
      techstacks: {
        create: [
          { techstack: { connect: { id: ts!.id } } },
          { techstack: { connect: { id: nx!.id } } },
          { techstack: { connect: { id: ns!.id } } },
        ],
      },
      tags: {
        create: [{ tag: { connect: { id: tagPortfolio.id } } }],
      },
    },
    include: {
      techstacks: true,
      tags: true,
    },
  });

  // --- BLOGS ---
  const blog1 = await prisma.blog.create({
    data: {
      userId: user.id,
      title: 'Building My Portfolio with Next.js and Prisma',
      slug: 'building-portfolio-next-prisma',
      content:
        'In this post, I share how I built my personal portfolio using Next.js and Prisma ORM.',
      projectId: projectPortfolio.id,
      tags: {
        create: [
          { tag: { connect: { id: tagPortfolio.id } } },
          { tag: { connect: { id: tagPrisma.id } } },
        ],
      },
    },
  });

  const blog2 = await prisma.blog.create({
    data: {
      userId: user.id,
      title: 'Why I Love TypeScript',
      slug: 'why-i-love-typescript',
      content:
        'TypeScript brings type safety and better developer experience to JavaScript.',
      tags: {
        create: [{ tag: { connect: { id: tagReact.id } } }],
      },
    },
  });

  // --- EDUCATION ---
  const education = await prisma.education.create({
    data: {
      userId: user.id,
      timeline: '2020 - 2024',
      title: 'Bachelor of Science in Computer Science',
      message: 'Ho Chi Minh City University of Science (HCMUS)',
      icon: '/images/about/education/hcmus.png',
      subItems: {
        create: [
          {
            title: 'Capstone Project',
            message: 'Developed an AI chatbot using TensorFlow and Python.',
          },
        ],
      },
    },
  });

  // --- EXPERIENCE ---
  const experience = await prisma.experience.create({
    data: {
      userId: user.id,
      company: 'TechNova Solutions',
      logoUrl: '/images/technova.png',
      location: 'Ho Chi Minh City, Vietnam',
      type: 'Full-time',
      description:
        'Worked on web applications using NestJS and React with PostgreSQL.',
      roles: {
        create: [
          {
            title: 'Fullstack Developer',
            startDate: new Date('2023-01-01'),
            endDate: new Date('2024-12-31'),
            tasks: {
              create: [
                {
                  content:
                    'Developed REST APIs with NestJS and integrated Prisma ORM.',
                },
                {
                  content:
                    'Built frontend components in React + TailwindCSS for admin dashboard.',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // --- TRANSLATIONS ---
  await prisma.translation.createMany({
    data: [
      {
        sourceText: 'Hello, world!',
        translated: 'Xin chào, thế giới!',
        language: 'vi',
      },
      {
        sourceText: 'Fullstack Developer',
        translated: 'Lập trình viên Fullstack',
        language: 'vi',
      },
      {
        sourceText: 'Personal Portfolio',
        translated: 'Trang cá nhân',
        language: 'vi',
      },
    ],
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
  });
