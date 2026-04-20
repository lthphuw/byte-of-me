import { prisma } from '../src';

async function main() {
  console.log('Seeding database...');

  // --- USER ---
  const birthdate = new Date(2002, 10, 20);

  const user = await prisma.user.create({
    data: {
      role: 'ADMIN',
      email: 'lthphuw@gmail.com',
      emailVerified: new Date(),
      userProfile: {
        create: {
          birthdate,
          translations: {
            create: [
              {
                language: 'en',
                displayName: 'Phu Luong',
                firstName: 'Phu',
                middleName: 'Thanh Hoang',
                lastName: 'Luong',
                greeting: 'Hi there!',
                tagLine: "I'm Phu, a developer who loves building cool stuff.",
                bio: 'Fullstack Developer focused on creating clean, scalable web applications.',
                quote: 'You’ll never know how good you might have become unless you try.',
                quoteAuthor: 'Mike Mentzer',
              },
            ]
          }
        }
      },
      socialLinks: {
        create: [
          { platform: 'email', url: 'lthphuw@gmail.com', sortOrder: 0 },
          { platform: 'github', url: 'https://github.com/lthphuw', sortOrder: 1 },
          { platform: 'portfolio', url: 'https://phu-lth.space', sortOrder: 2 },
          { platform: 'linkedIn', url: 'https://www.linkedin.com/in/phu-lth', sortOrder: 3 },
        ]
      },
      educations: {
        create: [
          {
            sortOrder: 0,
            startDate: new Date(2017, 7),
            endDate: new Date(2020, 6),
            translations: {
              create: [{ language: 'en', title: 'Phan Chau Trinh High School, Da Nang' }]
            }
          },
          {
            sortOrder: 1,
            startDate: new Date(2020, 9),
            endDate: new Date(2024, 12),
            translations: {
              create: [{ language: 'en', title: 'VNU-HCM University of Science' }]
            },
            achievements: {
              create: [
                { sortOrder: 0, translations: { create: [{ language: 'en', title: 'GPA: 8.67/10.0' }] } },
                { sortOrder: 1, translations: { create: [{ language: 'en', title: 'Graduation Thesis: 10/10 (Perfect Score)' }] } },
                { sortOrder: 2, translations: { create: [{ language: 'en', title: 'Outstanding Research Award' }] } },
                { sortOrder: 3, translations: { create: [{ language: 'en', title: 'Ranked 6th in the 2020 University Entrance Exam' }] } }
              ]
            }
          }
        ]
      }
    }
  });

  const techData: any[] = [
    { name: 'TypeScript', slug: 'typescript', group: 'Language' },
    { name: 'Next.js', slug: 'nextjs', group: 'Frontend' },
    { name: 'PostgreSQL', slug: 'postgresql', group: 'Database' },
    { name: 'Prisma', slug: 'prisma', group: 'Database' },
  ];

  const createdStacks = await Promise.all(
    techData.map(stack =>
      prisma.techStack.upsert({
        where: { slug: stack.slug },
        update: {},
        create: { ...stack, userId: user.id }
      })
    )
  );

  await prisma.techStack.createMany({
    data: [
      { name: 'NestJS', slug: 'nestjs', group: 'Backend', userId: user.id },
      { name: 'JavaScript', slug: 'javascript', group: 'Language', userId: user.id },
      { name: 'Python', slug: 'python', group: 'Language', userId: user.id },
      { name: 'Go', slug: 'go', group: 'Language', userId: user.id },
      { name: 'React', slug: 'react', group: 'Frontend', userId: user.id },
      { name: 'Express', slug: 'express', group: 'Backend', userId: user.id },
      { name: 'FastAPI', slug: 'fastapi', group: 'Backend', userId: user.id },
      { name: 'MongoDB', slug: 'mongodb', group: 'Database', userId: user.id },
      { name: 'Redis', slug: 'redis', group: 'Database', userId: user.id },
      { name: 'Docker', slug: 'docker', group: 'DevOps', userId: user.id },
      { name: 'Tailwind CSS', slug: 'tailwindcss', group: 'Styling', userId: user.id },
      { name: 'Kafka', slug: 'kafka', group: 'Message Queue', userId: user.id },
      { name: 'SeaweedFS', slug: 'seaweedfs', group: 'Object Storage', userId: user.id },
    ],
    skipDuplicates: true,
  });

  const project = await prisma.project.create({
    data: {
      slug: 'byte-of-me',
      githubLink: 'https://github.com/lthphuw/byte-of-me',
      liveLink: 'https://phu-lth.space',
      isPublished: true,
      userId: user.id,
      translations: {
        create: [
          {
            language: 'en',
            title: 'Byte of Me',
            description: 'A modern Portfolio built with Next.js, powered by Supabase for PostgreSQL and S3-compatible storage, secured by Auth.js.'
          },
          {
            language: 'vi',
            title: 'Byte of Me',
            description: 'Portfolio hiện đại xây dựng trên Next.js, sử dụng Supabase (PostgreSQL & S3 Storage) và bảo mật bởi Auth.js.'
          }
        ]
      },
      techStacks: {
        create: createdStacks.map((stack: any) => ({ techStackId: stack.id }))
      }
    }
  });

  const blog = await prisma.blog.create({
    data: {
      slug: 'tech-stack-reveal-byte-of-me',
      isPublished: true,
      userId: user.id,
      projectId: project.id,
      translations: {
        create: [
          {
            language: 'en',
            title: 'Deep Dive into the Byte of Me Tech Stack',
            description: 'Exploring how Prisma, Supabase, and Auth.js work together in a modular architecture.',
            content: ``
          },
        ]
      }
    }
  });

  await prisma.pageView.createMany({
    data: [
      { path: `/projects/${project.slug}`, projectId: project.id, userAgent: 'Vercel-Bot' },
      { path: `/blogs/${blog.slug}`, blogId: blog.id, userAgent: 'Mozilla/5.0' }
    ]
  });

  await prisma.interaction.create({
    data: {
      type: INTERACTION.LIKE,
      userId: user.id,
      blogId: blog.id
    }
  });

  await prisma.comment.create({
    data: {
      content: 'Impressive architecture on this one.',
      userId: user.id,
      projectId: project.id
    }
  });

  console.log('Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
