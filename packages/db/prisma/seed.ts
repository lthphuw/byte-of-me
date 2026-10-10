import { prisma } from '../src';

/**
 * Sample content for a fresh clone. Re-running is safe: every row has a fixed
 * id or slug. Public reads are scoped to SEED_AUTHOR_ID (AUTHOR_ID in apps/web/.env).
 */
const SEED_AUTHOR_ID = 'cseedauthor0000000000001';

/**
 * The seeded admin signs in with this address, so it must be the one typed on
 * the login page. Read from EMAIL in packages/db/.env.
 */
function readSeedEmail(): string {
  const email = process.env.EMAIL?.trim();
  if (!email) {
    throw new Error('EMAIL is not set. Add it to packages/db/.env (the seeded admin signs in with it).');
  }
  return email;
}

/** A TipTap document as the blog editor stores it: a JSON string. */
function richText(heading: string, paragraph: string): string {
  return JSON.stringify({
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] },
      { type: 'paragraph', content: [{ type: 'text', text: paragraph }] },
    ],
  });
}

async function main() {
  console.log('Seeding database...');

  const email = readSeedEmail();

  // A user who signed in before seeding owns this email under another id, and
  // the site would read the wrong author. Say so, instead of a raw P2002.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== SEED_AUTHOR_ID) {
    throw new Error(
      `${email} already belongs to user ${existing.id}. Reset the database, then seed before signing in (docs/setup.md).`
    );
  }

  // --- USER ---
  // Idempotent: re-running the seed must not trip the unique email.
  const user = await prisma.user.upsert({
    where: { id: SEED_AUTHOR_ID },
    update: {},
    create: {
      id: SEED_AUTHOR_ID,
      role: 'ADMIN',
      email,
      emailVerified: new Date(),
      userProfile: {
        create: {
          translations: {
            create: [
              {
                language: 'en',
                displayName: 'Demo Author',
                firstName: 'Demo',
                lastName: 'Author',
                greeting: 'Hi there!',
                tagLine: 'A sample portfolio, so you can explore the site right away.',
                bio: 'Everything on this site is sample content. Replace it in the dashboard.',
                quote: 'Start simple, then improve.',
                quoteAuthor: 'Sample',
              },
              {
                language: 'vi',
                displayName: 'Tác giả mẫu',
                firstName: 'Mẫu',
                lastName: 'Tác giả',
                greeting: 'Xin chào!',
                tagLine: 'Portfolio mẫu để bạn khám phá trang web ngay.',
                bio: 'Toàn bộ nội dung trên trang này là dữ liệu mẫu. Hãy thay đổi trong dashboard.',
                quote: 'Bắt đầu đơn giản, rồi cải thiện dần.',
                quoteAuthor: 'Mẫu',
              },
            ]
          }
        }
      },
      socialLinks: {
        create: [
          { platform: 'email', url: email, sortOrder: 0 },
          { platform: 'github', url: 'https://github.com/example', sortOrder: 1 },
          { platform: 'portfolio', url: 'https://example.com', sortOrder: 2 },
          { platform: 'linkedIn', url: 'https://www.linkedin.com/in/example', sortOrder: 3 },
        ]
      },
      educations: {
        create: [
          {
            sortOrder: 0,
            startDate: new Date(2018, 8),
            endDate: new Date(2022, 5),
            translations: {
              create: [
                { language: 'en', title: 'Sample University' },
                { language: 'vi', title: 'Đại học mẫu' },
              ]
            },
            achievements: {
              create: [
                {
                  sortOrder: 0,
                  translations: {
                    create: [
                      { language: 'en', title: 'Sample achievement' },
                      { language: 'vi', title: 'Thành tích mẫu' },
                    ]
                  }
                },
              ]
            }
          }
        ]
      }
    }
  });

  const techData: { name: string; slug: string; group: string }[] = [
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

  const project = await prisma.project.upsert({
    where: { slug: 'sample-project' },
    update: {},
    create: {
      slug: 'sample-project',
      githubLink: 'https://github.com/example/sample-project',
      liveLink: 'https://example.com',
      isPublished: true,
      userId: user.id,
      translations: {
        create: [
          {
            language: 'en',
            title: 'Sample Project',
            description: 'A sample project that shows how the portfolio presents work.'
          },
          {
            language: 'vi',
            title: 'Dự án mẫu',
            description: 'Dự án mẫu minh hoạ cách portfolio trình bày các công việc.'
          }
        ]
      },
      techStacks: {
        create: createdStacks.map(stack => ({ techStackId: stack.id }))
      }
    }
  });

  const blog = await prisma.blog.upsert({
    where: { slug: 'welcome-to-the-sample-blog' },
    update: {},
    create: {
      slug: 'welcome-to-the-sample-blog',
      isPublished: true,
      userId: user.id,
      projectId: project.id,
      translations: {
        create: [
          {
            language: 'en',
            title: 'Welcome to the sample blog',
            description: 'A short post created by the seed.',
            content: richText('Welcome', 'This post was created by the seed. Edit or delete it in the dashboard.'),
          },
          {
            language: 'vi',
            title: 'Chào mừng đến blog mẫu',
            description: 'Bài viết ngắn do lệnh seed tạo ra.',
            content: richText('Chào mừng', 'Bài viết này do lệnh seed tạo ra. Bạn có thể sửa hoặc xoá trong dashboard.'),
          },
        ]
      }
    }
  });

  await prisma.interaction.upsert({
    where: {
      userId_blogId_type: {
        userId: user.id,
        blogId: blog.id,
        type: 'LIKE'
      }
    },
    update: {},
    create: {
      // Mirrors INTERACTION.LIKE in the app; packages/db cannot import app code.
      type: 'LIKE',
      userId: user.id,
      blogId: blog.id
    }
  });

  const seedComment = 'Thanks for trying the sample!';
  const existingComment = await prisma.comment.findFirst({
    where: { content: seedComment, projectId: project.id }
  });
  if (!existingComment) {
    await prisma.comment.create({
      data: {
        content: seedComment,
        userId: user.id,
        projectId: project.id
      }
    });
  }

  console.log(`Seeding completed. Sign in as ${email} (magic link, see docs/setup.md).`);
  console.log(`AUTHOR_ID=${user.id} is already in apps/web/.env.example; copy it to apps/web/.env.`);
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
