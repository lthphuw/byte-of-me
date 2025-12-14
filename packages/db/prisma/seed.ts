import { prisma } from '../src';

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
      github: 'https://github.com/mockuser1201',
      portfolio: 'https://mock-portfolio.example.com',
      bio: 'A passionate fullstack developer building scalable web applications and exploring AI integration.',
      quote: 'Build things that matter.',
      image: 'https://avatars.githubusercontent.com/u/1?v=4',
      bannerImages: {
        create: [
          { src: '/images/banners/banner-1.jpeg', caption: 'A scenic mountain view captured during a hiking trip.' },
          { src: '/images/banners/banner-2.jpeg', caption: 'Urban skyline at dusk from a rooftop.' },
          { src: '/images/banners/banner-3.jpeg', caption: 'Abstract digital art representing data flow.' },
          { src: '/images/banners/banner-4.jpeg', caption: 'Coffee and laptop setup during a productive coding session.' },
          { src: '/images/banners/banner-5.jpeg', caption: 'Sunset over the ocean waves.' },
          { src: '/images/banners/banner-6.jpeg', caption: 'Night city lights reflecting on water.' },
          { src: '/images/banners/banner-7.jpeg', caption: 'Minimalist workspace with multiple monitors.' },
        ],
      },
    },
    include: { bannerImages: true },
  });

  // --- TECH STACKS ---
  await prisma.techStack.createMany({
    data: [
      { name: 'TypeScript', slug: 'typescript', group: 'Language', userId: user.id },
      { name: 'JavaScript', slug: 'javascript', group: 'Language', userId: user.id },
      { name: 'Python', slug: 'python', group: 'Language', userId: user.id },
      { name: 'Java', slug: 'java', group: 'Language', userId: user.id },
      { name: 'Go', slug: 'go', group: 'Language', userId: user.id },
      { name: 'Next.js', slug: 'nextjs', group: 'Frontend', userId: user.id },
      { name: 'React', slug: 'react', group: 'Frontend', userId: user.id },
      { name: 'Vue.js', slug: 'vuejs', group: 'Frontend', userId: user.id },
      { name: 'Svelte', slug: 'svelte', group: 'Frontend', userId: user.id },
      { name: 'NestJS', slug: 'nestjs', group: 'Backend', userId: user.id },
      { name: 'Express', slug: 'express', group: 'Backend', userId: user.id },
      { name: 'FastAPI', slug: 'fastapi', group: 'Backend', userId: user.id },
      { name: 'PostgreSQL', slug: 'postgresql', group: 'Database', userId: user.id },
      { name: 'MongoDB', slug: 'mongodb', group: 'Database', userId: user.id },
      { name: 'Redis', slug: 'redis', group: 'Database', userId: user.id },
      { name: 'Prisma', slug: 'prisma', group: 'Database', userId: user.id },
      { name: 'Docker', slug: 'docker', group: 'DevOps', userId: user.id },
      { name: 'Kubernetes', slug: 'kubernetes', group: 'DevOps', userId: user.id },
      { name: 'AWS', slug: 'aws', group: 'Cloud', userId: user.id },
      { name: 'Tailwind CSS', slug: 'tailwindcss', group: 'Styling', userId: user.id },
      { name: 'GraphQL', slug: 'graphql', group: 'API', userId: user.id },
      { name: 'TensorFlow', slug: 'tensorflow', group: 'AI/ML', userId: user.id },
      { name: 'PyTorch', slug: 'pytorch', group: 'AI/ML', userId: user.id },
    ],
    skipDuplicates: true,
  });

  // Fetch tech stacks for later use
  const ts = await prisma.techStack.findFirst({ where: { slug: 'typescript', userId: user.id } });
  const nextjs = await prisma.techStack.findFirst({ where: { slug: 'nextjs', userId: user.id } });
  const react = await prisma.techStack.findFirst({ where: { slug: 'react', userId: user.id } });
  const nestjs = await prisma.techStack.findFirst({ where: { slug: 'nestjs', userId: user.id } });
  const prismaTech = await prisma.techStack.findFirst({ where: { slug: 'prisma', userId: user.id } });
  const python = await prisma.techStack.findFirst({ where: { slug: 'python', userId: user.id } });
  const tensorflow = await prisma.techStack.findFirst({ where: { slug: 'tensorflow', userId: user.id } });
  const tailwind = await prisma.techStack.findFirst({ where: { slug: 'tailwindcss', userId: user.id } });
  const docker = await prisma.techStack.findFirst({ where: { slug: 'docker', userId: user.id } });
  const postgres = await prisma.techStack.findFirst({ where: { slug: 'postgresql', userId: user.id } });

  // --- TAGS ---
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: 'react' }, update: {}, create: { name: 'React', slug: 'react' } }),
    prisma.tag.upsert({ where: { slug: 'nextjs' }, update: {}, create: { name: 'Next.js', slug: 'nextjs' } }),
    prisma.tag.upsert({ where: { slug: 'prisma' }, update: {}, create: { name: 'Prisma', slug: 'prisma' } }),
    prisma.tag.upsert({ where: { slug: 'portfolio' }, update: {}, create: { name: 'Portfolio', slug: 'portfolio' } }),
    prisma.tag.upsert({ where: { slug: 'ai' }, update: {}, create: { name: 'AI', slug: 'ai' } }),
    prisma.tag.upsert({ where: { slug: 'machine-learning' }, update: {}, create: { name: 'Machine Learning', slug: 'machine-learning' } }),
    prisma.tag.upsert({ where: { slug: 'fullstack' }, update: {}, create: { name: 'Fullstack', slug: 'fullstack' } }),
    prisma.tag.upsert({ where: { slug: 'open-source' }, update: {}, create: { name: 'Open Source', slug: 'open-source' } }),
    prisma.tag.upsert({ where: { slug: 'rag' }, update: {}, create: { name: 'RAG', slug: 'rag' } }),
    prisma.tag.upsert({ where: { slug: 'typescript' }, update: {}, create: { name: 'TypeScript', slug: 'typescript' } }),
    prisma.tag.upsert({ where: { slug: 'dashboard' }, update: {}, create: { name: 'Dashboard', slug: 'dashboard' } }),
    prisma.tag.upsert({ where: { slug: 'authentication' }, update: {}, create: { name: 'Authentication', slug: 'authentication' } }),
    prisma.tag.upsert({ where: { slug: 'ecommerce' }, update: {}, create: { name: 'E-commerce', slug: 'ecommerce' } }),
    prisma.tag.upsert({ where: { slug: 'mobile' }, update: {}, create: { name: 'Mobile', slug: 'mobile' } }),
  ]);

  const [tagReact, tagNext, tagPrisma, tagPortfolio, tagAI, tagML, tagFullstack, tagOSS, tagRAG, tagTS, tagDashboard, tagAuth, tagEcommerce, tagMobile] = tags;

  // --- PROJECTS ---
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Alpha – Personal Portfolio with AI Assistant',
        slug: 'project-alpha',
        description: 'A modern full-stack portfolio featuring an AI-powered assistant using Retrieval-Augmented Generation (RAG). Supports multilingual, dark mode, and responsive design.',
        githubLink: 'https://github.com/mockuser1201/project-alpha',
        liveLink: 'https://project-alpha.example.com',
        techstacks: { create: [{ techstack: { connect: { id: ts!.id } } }, { techstack: { connect: { id: nextjs!.id } } }, { techstack: { connect: { id: nestjs!.id } } }, { techstack: { connect: { id: prismaTech!.id } } }, { techstack: { connect: { id: tailwind!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagPortfolio.id } } }, { tag: { connect: { id: tagFullstack.id } } }, { tag: { connect: { id: tagRAG.id } } }, { tag: { connect: { id: tagAI.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Beta – Analytics Dashboard',
        slug: 'project-beta',
        description: 'Interactive real-time dashboard for data visualization with custom charts, filters, and export features.',
        githubLink: 'https://github.com/mockuser1201/project-beta',
        liveLink: 'https://project-beta.example.com',
        techstacks: { create: [{ techstack: { connect: { id: react!.id } } }, { techstack: { connect: { id: ts!.id } } }, { techstack: { connect: { id: postgres!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagDashboard.id } } }, { tag: { connect: { id: tagFullstack.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Gamma – Task Management Platform',
        slug: 'project-gamma',
        description: 'Collaborative project management tool with Kanban boards, team assignments, and notifications.',
        githubLink: 'https://github.com/mockuser1201/project-gamma',
        liveLink: null,
        techstacks: { create: [{ techstack: { connect: { id: nestjs!.id } } }, { techstack: { connect: { id: react!.id } } }, { techstack: { connect: { id: docker!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagFullstack.id } } }, { tag: { connect: { id: tagOSS.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Delta – AI Image Classifier',
        slug: 'project-delta',
        description: 'Machine learning experiment for classifying and detecting objects in images using deep learning models.',
        githubLink: 'https://github.com/mockuser1201/project-delta',
        liveLink: null,
        techstacks: { create: [{ techstack: { connect: { id: python!.id } } }, { techstack: { connect: { id: tensorflow!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagAI.id } } }, { tag: { connect: { id: tagML.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Epsilon – E-commerce Platform',
        slug: 'project-epsilon',
        description: 'Full-featured online store with cart, checkout, payment integration, and admin panel.',
        githubLink: 'https://github.com/mockuser1201/project-epsilon',
        liveLink: 'https://project-epsilon.example.com',
        techstacks: { create: [{ techstack: { connect: { id: nextjs!.id } } }, { techstack: { connect: { id: postgres!.id } } }, { techstack: { connect: { id: tailwind!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagEcommerce.id } } }, { tag: { connect: { id: tagFullstack.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Zeta – Authentication System',
        slug: 'project-zeta',
        description: 'Secure user authentication service with JWT, OAuth2, and role-based access control.',
        githubLink: 'https://github.com/mockuser1201/project-zeta',
        liveLink: null,
        techstacks: { create: [{ techstack: { connect: { id: nestjs!.id } } }, { techstack: { connect: { id: prismaTech!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagAuth.id } } }] },
      },
    }),
    prisma.project.create({
      data: {
        userId: user.id,
        title: 'Project Eta – Mobile-Friendly Blog Engine',
        slug: 'project-eta',
        description: 'Lightweight blogging platform optimized for mobile with markdown support and SEO.',
        githubLink: 'https://github.com/mockuser1201/project-eta',
        liveLink: 'https://project-eta.example.com',
        techstacks: { create: [{ techstack: { connect: { id: nextjs!.id } } }, { techstack: { connect: { id: ts!.id } } }] },
        tags: { create: [{ tag: { connect: { id: tagMobile.id } } }, { tag: { connect: { id: tagOSS.id } } }] },
      },
    }),
  ]);

  // --- BLOGS ---
  await prisma.blog.createMany({
    data: [
      { userId: user.id, title: 'Building Modern Portfolios in 2025', slug: 'building-modern-portfolios-2025', content: 'Best practices and tools for creating standout developer portfolios.', projectId: projects[0].id },
      { userId: user.id, title: 'TypeScript Tips for Large Projects', slug: 'typescript-tips-large-projects', content: 'Advanced patterns and configurations to scale TypeScript effectively.' },
      { userId: user.id, title: 'Getting Started with RAG Applications', slug: 'getting-started-rag', content: 'Step-by-step guide to building your first Retrieval-Augmented Generation system.' },
      { userId: user.id, title: 'Docker Best Practices for Developers', slug: 'docker-best-practices', content: 'How to write clean Dockerfiles and optimize images.' },
      { userId: user.id, title: 'State Management in React 2025', slug: 'react-state-management-2025', content: 'Comparing Zustand, Redux, and Context API in modern React apps.' },
      { userId: user.id, title: 'Deploying Fullstack Apps to AWS', slug: 'deploying-to-aws', content: 'Complete guide from local development to production on AWS.' },
      { userId: user.id, title: 'Building Accessible Web Apps', slug: 'building-accessible-apps', content: 'Essential techniques for WCAG compliance and better user experience.' },
      { userId: user.id, title: 'Performance Optimization in Next.js', slug: 'nextjs-performance', content: 'Image optimization, caching strategies, and code splitting tips.' },
      { userId: user.id, title: 'Introduction to GraphQL APIs', slug: 'intro-to-graphql', content: 'Why GraphQL and how to get started with Apollo Server.' },
      { userId: user.id, title: 'Testing Strategies for Fullstack Apps', slug: 'testing-fullstack-apps', content: 'Unit, integration, and end-to-end testing best practices.' },
    ],
  });

  // Connect some tags to blogs
  const blogs = await prisma.blog.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });
  await Promise.all([
    prisma.blog.update({ where: { id: blogs[0].id }, data: { tags: { create: [{ tag: { connect: { id: tagNext.id } } }, { tag: { connect: { id: tagPortfolio.id } } }] } } }),
    prisma.blog.update({ where: { id: blogs[1].id }, data: { tags: { create: [{ tag: { connect: { id: tagTS.id } } }] } } }),
    prisma.blog.update({ where: { id: blogs[2].id }, data: { tags: { create: [{ tag: { connect: { id: tagAI.id } } }, { tag: { connect: { id: tagRAG.id } } }] } } }),
    prisma.blog.update({ where: { id: blogs[3].id }, data: { tags: { create: [{ tag: { connect: { id: tagOSS.id } } }] } } }),
    prisma.blog.update({ where: { id: blogs[4].id }, data: { tags: { create: [{ tag: { connect: { id: tagReact.id } } }] } } }),
  ]);

  // --- EDUCATION ---
  await prisma.education.createMany({
    data: [
      { userId: user.id, timeline: '2021 - 2025', title: 'Bachelor of Science in Computer Science', message: 'Mock University of Technology', icon: '/images/about/education/mock-university.png' },
      { userId: user.id, timeline: '2018 - 2021', title: 'High School Diploma', message: 'Example High School for Advanced Studies', icon: '/images/about/education/mock-highschool.png' },
    ],
  });

  const bachelorEdu = await prisma.education.findFirst({ where: { userId: user.id, title: { contains: 'Bachelor' } } });
  if (bachelorEdu) {
    await prisma.educationSubItem.createMany({
      data: [
        { educationId: bachelorEdu.id, title: 'Capstone Project', message: 'Fullstack web application with AI integration' },
        { educationId: bachelorEdu.id, title: 'GPA', message: '3.8 / 4.0' },
        { educationId: bachelorEdu.id, title: 'Relevant Coursework', message: 'Algorithms, Database Systems, Web Development, Machine Learning, Software Engineering' },
        { educationId: bachelorEdu.id, title: 'Achievements', message: 'Dean\'s List 2023-2024' },
      ],
    });
  }

  // --- EXPERIENCE ---
  await prisma.experience.createMany({
    data: [
      {
        userId: user.id,
        company: 'Acme Innovations Corp',
        logoUrl: '/images/mock-company1.png',
        location: 'Remote',
        type: 'Full-time',
        description: 'Developed modern web applications using TypeScript stack for enterprise clients.',
      },
      {
        userId: user.id,
        company: 'FooBar Tech Solutions',
        logoUrl: '/images/mock-company2.png',
        location: 'Remote',
        type: 'Internship',
        description: 'Contributed to internal tools and automation systems.',
      },
      {
        userId: user.id,
        company: 'StartupXYZ',
        logoUrl: '/images/mock-company3.png',
        location: 'Remote',
        type: 'Freelance',
        description: 'Built MVP products for early-stage startups.',
      },
    ],
  });

  const experiences = await prisma.experience.findMany({ where: { userId: user.id } });
  await prisma.experience.update({
    where: { id: experiences[0].id },
    data: {
      roles: {
        create: [{
          title: 'Fullstack Developer',
          startDate: new Date('2024-01-01'),
          endDate: null,
          tasks: {
            create: [
              { content: 'Designed and implemented scalable APIs' },
              { content: 'Led frontend architecture decisions' },
              { content: 'Optimized database performance' },
              { content: 'Mentored junior developers' },
            ],
          },
        }],
      },
    },
  });

  // --- TRANSLATIONS ---
  await prisma.translation.createMany({
    data: [
      { sourceText: 'Hello, world!', translated: 'Xin chào, thế giới!', language: 'vi' },
      { sourceText: 'Fullstack Developer', translated: 'Lập trình viên Fullstack', language: 'vi' },
      { sourceText: 'Projects', translated: 'Dự án', language: 'vi' },
      { sourceText: 'Blog', translated: 'Blog', language: 'vi' },
      { sourceText: 'About', translated: 'Giới thiệu', language: 'vi' },
      { sourceText: 'Experience', translated: 'Kinh nghiệm', language: 'vi' },
      { sourceText: 'Education', translated: 'Học vấn', language: 'vi' },
      { sourceText: 'Tech Stack', translated: 'Công nghệ', language: 'vi' },
      { sourceText: 'Contact', translated: 'Liên hệ', language: 'vi' },
      { sourceText: 'Read more', translated: 'Đọc thêm', language: 'vi' },
      { sourceText: 'View live', translated: 'Xem trực tiếp', language: 'vi' },
      { sourceText: 'View source', translated: 'Xem mã nguồn', language: 'vi' },
      { sourceText: 'Portfolio', translated: 'Danh mục cá nhân', language: 'vi' },
      { sourceText: 'Open Source', translated: 'Mã nguồn mở', language: 'vi' },
    ],
    skipDuplicates: true,
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
