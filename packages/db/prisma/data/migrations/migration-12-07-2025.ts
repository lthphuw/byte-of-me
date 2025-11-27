/* The above code is a comment block in TypeScript. It appears to be attempting to import the `dotenv`
module using the `import` statement, but the actual import statement is commented out with ` */
import { PrismaClient, User } from '@prisma/client';
import * as dotenv from 'dotenv';

const prisma = new PrismaClient();

dotenv.config();
type PrismaModel = {
  deleteMany: () => Promise<any>;
};

async function main(): Promise<void> {
  console.log('Seeding database...');

  const user = await findUser();
  if (!user) {
    console.warn('User not found!');
    return;
  }

  await updateTechstacks(user);
  await updateProjects(user);

  console.log('Seeding completed.');
}

main()
  .catch((e: unknown) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
  });

async function findUser() {
  return await prisma.user.findUnique({
    where: {
      email: 'lthphuw@gmail.com',
    },
  });
}

async function updateTechstacks(user: User) {
  const techStacks = [
    // AI & Vector Databases
    {
      userId: user.id,
      name: 'Pinecone',
      group: 'AI',
      logo: '/images/about/techstacks/pinecone.png',
    },
    {
      userId: user.id,
      name: 'LangChain',
      group: 'AI',
      logo: '/images/about/techstacks/langchain.png',
    },
  ];

  return await prisma.techStack.createMany({
    data: techStacks.map((ts) => ({
      ...ts,
    })),
    skipDuplicates: true,
  });
}

async function updateProjects(user: User) {
  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });


  const techStackMap = new Map(techStacks.map((ts) => [ts.name, ts.id]));

  const project = await prisma.project.findFirst({
    where: {
      title: 'Byte of me',
      userId: user.id,
    },
  });

  if (!project) {
    console.warn(`Project "Byte of me" not found.`);
    return;
  }

  const createdProj = await prisma.project.update({
    where: {
      id: project.id,
    },
    data: {
      description:
        'A full-stack portfolio with a free-tier AI assistant powered by a RAG pipeline. Explore my projects and skills through natural language queries, with support for i18n, dark/light mode, and responsive design.',
      techstacks: {
        create: [
          ...new Set(
            [
              'Pinecone',
              'LangChain',
            ]
              .map((name) => techStackMap.get(name))
              .filter((id): id is string => Boolean(id))
              .map((id) => ({ techstackId: id })),
          ),
        ],
      },
      translations: {
        create: [
          {
            language: 'en',
            field: 'description',
            value:
              'A full-stack portfolio with a free-tier AI assistant powered by a RAG pipeline. Explore my projects and skills through natural language queries, with support for i18n, dark/light mode, and responsive design.',
          },
          {
            language: 'vi',
            field: 'description',
            value:
              'Một portfolio full-stack với trợ lý AI miễn phí được hỗ trợ bởi pipeline RAG. Khám phá các dự án và kỹ năng của tôi thông qua truy vấn ngôn ngữ tự nhiên, với hỗ trợ đa ngôn ngữ (i18n), chế độ sáng/tối và thiết kế đáp ứng trên mọi thiết bị.',
          },
          {
            language: 'fr',
            field: 'description',
            value:
              'Un portfolio full-stack avec un assistant IA gratuit, propulsé par un pipeline RAG. Explorez mes projets et compétences via des requêtes en langage naturel, avec prise en charge de l’internationalisation (i18n), du mode clair/sombre et d’un design responsive.',
          },
        ],
      },
    },
  });

  console.log(`Updated project: ${createdProj.title}`);
}
