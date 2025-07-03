/* The above code is a comment block in TypeScript. It appears to be attempting to import the `dotenv`
module using the `import` statement, but the actual import statement is commented out with ` */
import { Coauthor, PrismaClient, User } from '@prisma/client';
import * as dotenv from 'dotenv';

const prisma = new PrismaClient();

dotenv.config();
type PrismaModel = {
  deleteMany: () => Promise<any>;
};

async function safeDeleteMany<T extends PrismaModel>(
  model: T,
  modelName: string,
) {
  try {
    await model.deleteMany();
    console.log(`Cleared ${modelName} table`);
  } catch (error) {
    console.warn(
      `Warning: Failed to clear ${modelName} table. It may not exist yet.`,
      error,
    );
  }
}

async function main(): Promise<void> {
  console.log('Seeding database...');
  await cleanData();

  // Seed user
  const user = await seedUser();

  // Seed user banner image
  await seedUserBannerImage(user);

  // Seed education
  await seedEducations(user);

  // Seed tech stacks
  await seedTechstacks(user);

  // Seed experiences
  await seedExperiences(user);

  await seedTags(user);

  // Seed coauthors
  const coauthors = await seedCoauthor();

  // Seed projects
  await seedProjects(user, coauthors);

  console.log('Seeding completed!');
}

main()
  .catch((e: unknown) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
  });

async function cleanData() {
  // Clear data in correct order with safe deletion
  await safeDeleteMany(prisma.translation, 'translation');
  await safeDeleteMany(prisma.blogTag, 'BlogTag');
  await safeDeleteMany(prisma.projectOnProjectCoAuthor, 'techStackOnProjects');
  await safeDeleteMany(prisma.techStackOnProjects, 'techStackOnProjects');
  await safeDeleteMany(prisma.techStackOnExperiences, 'techStackOnExperiences');
  await safeDeleteMany(prisma.educationSubItem, 'EducationSubItem');
  await safeDeleteMany(prisma.task, 'Task');
  await safeDeleteMany(prisma.blog, 'Blog');
  await safeDeleteMany(prisma.blog, 'Blog');
  await safeDeleteMany(prisma.coauthor, 'Coauthor');
  await safeDeleteMany(prisma.project, 'Project');
  await safeDeleteMany(prisma.experienceRole, 'Experience');
  await safeDeleteMany(prisma.experience, 'Experience');
  await safeDeleteMany(prisma.education, 'Education');
  await safeDeleteMany(prisma.tag, 'Tag');
  await safeDeleteMany(prisma.techStack, 'TechStack');
  await safeDeleteMany(prisma.userBannerImage, 'UserImageBanner');
  await safeDeleteMany(prisma.user, 'User');
}

async function seedUser() {
  return await prisma.user.create({
    data: {
      name: 'Luong Thanh Phu Hoang',
      firstName: 'Phu',
      lastName: 'Luong Thanh Hoang',
      birthdate: '2002-11-20',
      greeting: "Hi, I'm Phu",
      tagLine:
        'Crafting code, shaping careers, enjoying the game — one byte at a time.',
      email: 'lthphuw@gmail.com',
      image: '/images/avatars/HaNoi2024.jpeg',
      imageCaption:
        'Taken at the Vietnam Military History Museum, this 2024 painting is titled “Sống bám đá, chết hoá đá” — “Cling to rocks in life, turn to stone in death.”',
      quote: `I enjoy learning new things and have a strong interest in open-source projects, where I often discover useful ideas and best practices. These experiences help me build better and more efficient solutions. For me, growth doesn’t just come from work — it also comes from self-exploration and continuous learning. That’s what truly drives my development.`,
      bio: 'A passionate developer exploring the world of open-source and modern web technologies.',
      aboutMe: `
    <div class="text-sm md:text-base space-y-2">
      <p>
        <strong>Full name:</strong> Luong Thanh Hoang Phu<br />
        <strong>Date of birth:</strong> November 20, 2002<br />
        <strong>Location:</strong> Ho Chi Minh City, Vietnam
      </p>
      <p>
        I'm a <strong>junior full-stack developer</strong>, mainly focused on <strong>backend development</strong>. I enjoy building <strong>high-performance</strong>, <strong>scalable systems</strong> and have hands-on experience with <strong>Golang</strong>, <strong>Node.js</strong>, and <strong>Python</strong>. While backend is my strong suit, I've also worked with frontend technologies like <strong>React.js</strong> and <strong>Next.js</strong>. I’ve dabbled in <strong>AI</strong> too, doing some research and building simple models. I'm always eager to learn and grow through <em>real-world projects</em>.
      </p>
      <p>
        Moving forward, I aim to deepen my knowledge in <strong>system design</strong>, <strong>distributed systems</strong>, and <strong>AI integration</strong> – with the goal of building <strong>smart</strong>, <strong>efficient</strong>, and <strong>reliable software</strong> at scale.
      </p>
    </div>
  `,
      linkedIn: 'www.linkedin.com/in/phu-lth',
      github: 'https://github.com/lthphuw',
      translations: {
        create: [
          { language: 'en', field: 'greeting', value: "Hi, I'm Phu" },
          { language: 'vi', field: 'greeting', value: 'Chào, mình là Phú' },
          { language: 'fr', field: 'greeting', value: 'Salut, je suis Phu' },
          {
            language: 'en',
            field: 'tagLine',
            value:
              'Crafting code, shaping careers, enjoying the game — one byte at a time.',
          },
          {
            language: 'vi',
            field: 'tagLine',
            value: 'Tay gõ code, đầu lo job, tim chill game — từng byte một.',
          },
          {
            language: 'fr',
            field: 'tagLine',
            value:
              'Du code, une carrière, et le plaisir du jeu — un octet à la fois.',
          },
          {
            language: 'en',
            field: 'imageCaption',
            value:
              'Taken at the Vietnam Military History Museum, this 2024 painting is titled “Sống bám đá, chết hoá đá” — “Cling to rocks in life, turn to stone in death.”',
          },
          {
            language: 'vi',
            field: 'imageCaption',
            value:
              'Chụp tại Bảo tàng Lịch sử Quân sự Việt Nam, bức tranh năm 2024 có tiêu đề “Sống bám đá, chết hoá đá.”',
          },
          {
            language: 'fr',
            field: 'imageCaption',
            value:
              "Pris au Musée d'Histoire Militaire du Vietnam, ce tableau de 2024 est intitulé “Sống bám đá, chết hoá đá” — “S'accrocher aux rochers dans la vie, se transformer en pierre dans la mort.”",
          },
          {
            language: 'en',
            field: 'quote',
            value:
              'I enjoy learning new things and have a strong interest in open-source projects, where I often discover useful ideas and best practices. These experiences help me build better and more efficient solutions. For me, growth doesn’t just come from work — it also comes from self-exploration and continuous learning. That’s what truly drives my development.',
          },
          {
            language: 'vi',
            field: 'quote',
            value:
              'Mình thích học hỏi những điều mới và có hứng thú mạnh mẽ với các dự án mã nguồn mở, nơi mình thường tìm thấy những ý tưởng hữu ích và các phương pháp hay nhất. Những trải nghiệm này giúp mình xây dựng các giải pháp tốt hơn và hiệu quả hơn. Đối với mình, sự phát triển không chỉ đến từ công việc — mà còn từ việc tự khám phá và học tập không ngừng. Đó là điều thực sự thúc đẩy sự phát triển của mình.',
          },
          {
            language: 'fr',
            field: 'quote',
            value:
              "J'aime apprendre de nouvelles choses et j'ai un fort intérêt pour les projets open-source, où je découvre souvent des idées utiles et des meilleures pratiques. Ces expériences m'aident à construire des solutions meilleures et plus efficaces. Pour moi, la croissance ne vient pas seulement du travail, mais aussi de l'auto-exploration et de l'apprentissage continu. C'est ce qui motive véritablement mon développement.",
          },
          {
            language: 'en',
            field: 'bio',
            value:
              'A passionate developer exploring the world of open-source and modern web technologies.',
          },
          {
            language: 'vi',
            field: 'bio',
            value:
              'Một lập trình viên đam mê khám phá thế giới mã nguồn mở và công nghệ web hiện đại.',
          },
          {
            language: 'fr',
            field: 'bio',
            value:
              "Un développeur passionné explorant le monde de l'open-source et des technologies web modernes.",
          },
          {
            language: 'en',
            field: 'aboutMe',
            value: `
    <div class="text-sm md:text-base space-y-2">
      <p>
        <strong>Full name:</strong> Luong Thanh Hoang Phu<br />
        <strong>Date of birth:</strong> November 20, 2002<br />
        <strong>Location:</strong> Ho Chi Minh City, Vietnam
      </p>
      <p>
        I'm a <strong>junior full-stack developer</strong>, mainly focused on <strong>backend development</strong>. I enjoy building <strong>high-performance</strong>, <strong>scalable systems</strong> and have hands-on experience with <strong>Golang</strong>, <strong>Node.js</strong>, and <strong>Python</strong>. While backend is my strong suit, I've also worked with frontend technologies like <strong>React.js</strong> and <strong>Next.js</strong>. I’ve dabbled in <strong>AI</strong> too, doing some research and building simple models. I'm always eager to learn and grow through <em>real-world projects</em>.
      </p>
      <p>
        Moving forward, I aim to deepen my knowledge in <strong>system design</strong>, <strong>distributed systems</strong>, and <strong>AI integration</strong> – with the goal of building <strong>smart</strong>, <strong>efficient</strong>, and <strong>reliable software</strong> at scale.
      </p>
    </div>
  `,
          },
          {
            language: 'vi',
            field: 'aboutMe',
            value: `
   <div class="text-sm md:text-base space-y-2">
  <p>
    <strong>Họ tên:</strong> Lương Thanh Hoàng Phú<br />
    <strong>Ngày sinh:</strong> 20/11/2002<br />
    <strong>Sinh sống:</strong> TP. Hồ Chí Minh, Việt Nam
  </p>
  <p>
    Mình là một <strong>lập trình viên full-stack junior</strong>, tập trung chủ yếu vào <strong>backend</strong>. Mình yêu thích xây dựng các <strong>hệ thống hiệu năng cao</strong>, <strong>có khả năng mở rộng</strong> và từng làm việc thực tế với <strong>Golang</strong>, <strong>Node.js</strong> và <strong>Python</strong>. Ngoài ra, mình cũng từng làm frontend với <strong>React.js</strong> và <strong>Next.js</strong>. Mình đã thử sức với <strong>AI</strong>, nghiên cứu và xây dựng vài mô hình đơn giản. Mình luôn khao khát được học hỏi và phát triển qua <em>dự án thực tế</em>.
  </p>
  <p>
    Trong thời gian tới, mình hướng đến việc đào sâu hơn về <strong>thiết kế hệ thống</strong>, <strong>hệ phân tán</strong> và <strong>tích hợp AI</strong> – với mục tiêu xây dựng <strong>phần mềm thông minh</strong>, <strong>hiệu quả</strong> và <strong>đáng tin cậy</strong> ở quy mô lớn.
  </p>
</div>

  `,
          },
          {
            language: 'fr',
            field: 'aboutMe',
            value: `
            <div class="text-sm md:text-base space-y-2">
  <p>
    <strong>Nom complet :</strong> Luong Thanh Hoang Phu<br />
    <strong>Date de naissance :</strong> 20/11/2002<br />
    <strong>Lieu :</strong> Hô Chi Minh-Ville, Vietnam
  </p>
  <p>
    Je suis un <strong>développeur full-stack junior</strong>, spécialisé principalement dans le <strong>backend</strong>. J’aime construire des <strong>systèmes performants</strong> et <strong>évolutifs</strong>, et j’ai de l’expérience pratique avec <strong>Golang</strong>, <strong>Node.js</strong> et <strong>Python</strong>. Bien que le backend soit mon point fort, j’ai également travaillé avec des technologies frontend comme <strong>React.js</strong> et <strong>Next.js</strong>. J’ai aussi exploré <strong>l’IA</strong>, fait de la recherche et créé quelques modèles simples. Je suis toujours motivé à apprendre et progresser à travers <em>des projets concrets</em>.
  </p>
  <p>
    À l’avenir, je souhaite approfondir mes connaissances en <strong>conception de systèmes</strong>, <strong>systèmes distribués</strong> et <strong>intégration de l’IA</strong> – dans le but de créer des <strong>logiciels intelligents</strong>, <strong>efficaces</strong> et <strong>fiables</strong> à grande échelle.
  </p>
</div>

            `,
          },
        ],
      },
    },
  });
}

async function seedUserBannerImage(user: User) {
  await prisma.userBannerImage.create({
    data: {
      userId: user.id,
      src: '/images/banners/image3.jpeg',
      caption: '',
      translations: {
        create: [
          {
            language: 'vi',
            field: 'caption',
            value:
              "Trình bày bài báo khoa học đầu tiên về 'Phát hiện bất thường trong ảnh y khoa dựa trên mô hình Ngôn ngữ-Ảnh' tại workshop CV4DC 2024.",
          },
          {
            language: 'en',
            field: 'caption',
            value:
              "Presented the first scientific paper on 'Anomaly Detection in Medical Images Using Language-Vision Models' at the CV4DC 2024 workshop.",
          },
          {
            language: 'fr',
            field: 'caption',
            value:
              "Présentation du premier article scientifique sur 'Détection d'anomalies dans les images médicales à l'aide de modèles Langage-Vision' lors de l'atelier CV4DC 2024.",
          },
        ],
      },
    },
  });

  await prisma.userBannerImage.create({
    data: {
      userId: user.id,
      src: '/images/banners/image2.jpeg',
      caption: '',
      translations: {
        create: [
          {
            language: 'vi',
            field: 'caption',
            value: 'Chụp tại Quảng trường Ba Đình, Hà Nội năm 2024.',
          },
          {
            language: 'en',
            field: 'caption',
            value: 'Taken at Ba Đình Square, Hanoi, in 2024.',
          },
          {
            language: 'fr',
            field: 'caption',
            value: 'Prise à la Place Ba Đình, Hanoï, en 2024.',
          },
        ],
      },
    },
  });

  await prisma.userBannerImage.create({
    data: {
      userId: user.id,
      src: '/images/banners/image1.jpeg',
      caption: '', // Giữ caption mặc định rỗng
      translations: {
        create: [
          {
            language: 'vi',
            field: 'caption',
            value:
              "Chụp tại Bảo tàng Lịch sử Quân sự Việt Nam, bức ảnh năm 2024 mang tên 'Sống bám đá, chết hóa đá.'",
          },
          {
            language: 'en',
            field: 'caption',
            value:
              "Captured at the Vietnam Military History Museum, this 2024 photo is titled 'Sống bám đá, chết hóa đá.' - 'Live clinging to stone, die turning to stone.'",
          },
          {
            language: 'fr',
            field: 'caption',
            value:
              "Prise au Musée d'Histoire Militaire du Vietnam, cette photo de 2024 est intitulée 'Sống bám đá, chết hóa đá.' - 'Vivre accroché à la pierre, mourir en pierre.'",
          },
        ],
      },
    },
  });
}

async function seedEducations(user: User) {
  await prisma.education.create({
    data: {
      userId: user.id,
      timeline: '2020 - 2024',
      title: 'Bachelor of Science (Honors Program) in Information Technology',
      message: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                            <span>Studied at <strong>University of Science, VNU-HCM</strong>, focusing on Software Engineering and AI.</span>
                        <span>Participated in research projects and published papers.</span>
                        </div>
        `,
      icon: '/images/about/education/hcmus.png',
      translations: {
        create: [
          {
            language: 'en',
            field: 'title',
            value:
              'Bachelor of Science (Honors Program) in Information Technology',
          },
          {
            language: 'vi',
            field: 'title',
            value:
              'Cử nhân Khoa học (Chương trình Tài năng) ngành Công nghệ Thông tin',
          },
          {
            language: 'fr',
            field: 'title',
            value: "Licence en sciences (programme d'honneur) en informatique",
          },
          {
            language: 'en',
            field: 'message',
            value: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                            <span>Studied at <strong>University of Science, VNU-HCM</strong>, focusing on Software Engineering and AI.</span>
                        <span>Participated in research projects and published papers.</span>
                        </div>
                    
                `,
          },
          {
            language: 'vi',
            field: 'message',
            value: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                    <span>Học tại <strong>Đại học Khoa học Tự nhiên, ĐHQG-HCM</strong>, tập trung vào Kỹ thuật Phần mềm và AI.</span>
                    <span>Tham gia các dự án nghiên cứu và công bố bài báo.</span>
                        </div>
                `,
          },
          {
            language: 'fr',
            field: 'message',
            value: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                    <span>Étudié à l'<strong>Université des Sciences, VNU-HCM</strong>, en se concentrant sur l'ingénierie logicielle et l'IA.</span>
                    <span>Participé à des projets de recherche et publié des articles.</span>
                        </div>
                `,
          },
        ],
      },
      subItems: {
        create: [
          {
            title: 'Academic Performance',
            message: '<p>Graduated with a GPA of <strong>8.67/10</strong>.</p>',
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'Academic Performance',
                },
                { language: 'vi', field: 'title', value: 'Thành tích học tập' },
                {
                  language: 'fr',
                  field: 'title',
                  value: 'Performance académique',
                },
                {
                  language: 'en',
                  field: 'message',
                  value:
                    '<p>Graduated with a GPA of <strong>8.67/10</strong>.</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value: '<p>Tốt nghiệp với GPA <strong>8.67/10</strong>.</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value:
                    '<p>Diplômé avec une moyenne de <strong>8.67/10</strong>.</p>',
                },
              ],
            },
          },
          {
            title: 'Published Paper at CV4DC 2024',
            message: `
                                      <div class="flex flex-col gap-1 text-sm leading-relaxed">
                                        <p>
                                          Published at
                                          <a href="https://cv4dc.github.io/2024/" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">
                                            CV4DC 2024
                                          </a>:
                                          <em class="italic">Abnormality Detection in Medical Image Based on Visual-Language Model</em>
                                          <strong class="font-semibold text-green-700">(Oral)</strong>.
                                        </p>
                                        <p>
                                          Authors: <span class="font-medium">Hoang-Phu Thanh-Luong</span>, Van-Thai Vu, and
                                          <span class="italic">Prof. Quoc-Ngoc Ly</span>.
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">
                                            [View Paper]
                                          </a>
                                        </p>
                                      </div>
                                    `,
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'Published Paper at CV4DC 2024',
                },
                {
                  language: 'vi',
                  field: 'title',
                  value: 'Xuất bản bài báo tại CV4DC 2024',
                },
                {
                  language: 'fr',
                  field: 'title',
                  value: 'Document publié sur CV4DC 2024',
                },
                {
                  language: 'en',
                  field: 'message',
                  value: `
                                      <div class="flex flex-col gap-1 text-sm leading-relaxed">
                                        <p>
                                          Published at 
                                          <a href="https://cv4dc.github.io/2024/" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">
                                            CV4DC 2024
                                          </a>: 
                                          <em class="italic">Abnormality Detection in Medical Image Based on Visual-Language Model</em> 
                                          <strong class="font-semibold text-green-700">(Oral)</strong>.
                                        </p>
                                        <p>
                                          Authors: <span class="font-medium">Hoang-Phu Thanh-Luong</span>, Van-Thai Vu, and 
                                          <span class="italic">Prof. Quoc-Ngoc Ly</span>.
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-blue-600 underline hover:text-blue-800">
                                            [View Paper]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                },
                {
                  language: 'vi',
                  field: 'message',
                  value: `
                                      <div class="flex flex-col gap-1 text-sm leading-relaxed">
                                        <p>
                                          Công bố tại 
                                          <a href="https://cv4dc.github.io/2024/" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">
                                            CV4DC 2024
                                          </a>: 
                                          <em class="italic">Abnormality Detection in Medical Image Based on Visual-Language Model</em> 
                                          <strong class="font-semibold text-green-700">(Oral)</strong>.
                                        </p>
                                        <p>
                                          Tác giả: <span class="font-medium">Lương Thanh Hoàng Phú</span>, Vũ Văn Thái, và 
                                          <span class="italic">PGS. TS. Lý Quốc Ngọc</span>.
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-blue-600 underline hover:text-blue-800">
                                            [Xem bài báo]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                },
                {
                  language: 'fr',
                  field: 'message',
                  value: `
                                      <div class="flex flex-col gap-1 text-sm leading-relaxed">
                                        <p>
                                          Publié à 
                                          <a href="https://cv4dc.github.io/2024/" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">
                                            CV4DC 2024
                                          </a>: 
                                          <em class="italic">Abnormality Detection in Medical Image Based on Visual-Language Model</em> 
                                          <strong class="font-semibold text-green-700">(Oral)</strong>.
                                        </p>
                                        <p>
                                          Auteurs : <span class="font-medium">Hoang-Phu Thanh-Luong</span>, Van-Thai Vu, et 
                                          <span class="italic">Professeur Quoc-Ngoc Ly</span>.
                                        </p>
                                        <p>
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-blue-600 underline hover:text-blue-800">
                                            [Voir l'article]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                },
              ],
            },
          },
          {
            title: 'Thesis Score',
            message: '<p>Thesis Score: <strong>10/10</strong> (Excellent).</p>',
            translations: {
              create: [
                { language: 'en', field: 'title', value: 'Thesis Score' },
                { language: 'vi', field: 'title', value: 'Điểm luận văn' },
                { language: 'fr', field: 'title', value: 'Score de thèse' },
                {
                  language: 'en',
                  field: 'message',
                  value:
                    '<p>Thesis Score: <strong>10/10</strong> (Excellent).</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value:
                    '<p>Điểm luận văn: <strong>10/10</strong> (Xuất sắc).</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value:
                    '<p>Score de thèse : <strong>10/10</strong> (Excellent).</p>',
                },
              ],
            },
          },
          {
            title: 'Outstanding Student Research Award',
            message: '<p>Awarded for excellence in scientific research.</p>',
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'Outstanding Student Research Award',
                },
                {
                  language: 'vi',
                  field: 'title',
                  value: 'Giải thưởng Sinh viên Nghiên cứu Xuất sắc',
                },
                {
                  language: 'fr',
                  field: 'title',
                  value: 'Prix de recherche étudiant exceptionnel',
                },
                {
                  language: 'en',
                  field: 'message',
                  value:
                    '<p>Awarded for excellence in scientific research.</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value:
                    '<p>Được trao giải vì xuất sắc trong nghiên cứu khoa học.</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value:
                    "<p>Récompensé pour l'excellence en recherche scientifique.</p>",
                },
              ],
            },
          },
          {
            title: 'Top 6 Highest Entrance Exam Scorers',
            message:
              '<p>Ranked in the top 6 highest entrance exam scorers in 2020.</p>',
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'Top 6 Highest Entrance Exam Scorers',
                },
                {
                  language: 'vi',
                  field: 'title',
                  value: 'Top 6 Thí sinh có điểm thi đầu vào cao nhất',
                },
                {
                  language: 'fr',
                  field: 'title',
                  value: "Top 6 des meilleurs scores à l'examen d'entrée",
                },
                {
                  language: 'en',
                  field: 'message',
                  value:
                    '<p>Ranked in the top 6 highest entrance exam scorers in 2020.</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value:
                    '<p>Xếp trong top 6 thí sinh có điểm thi đầu vào cao nhất năm 2020.</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value:
                    "<p>Classé parmi les 6 meilleurs scores à l'examen d'entrée en 2020.</p>",
                },
              ],
            },
          },
          {
            title: 'AI Challenge 2023 (HCMC)',
            message: '<p>Consolation prize.</p>',
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'AI Challenge 2023 (HCMC)',
                },
                {
                  language: 'vi',
                  field: 'title',
                  value: 'AI Challenge 2023 (HCMC)',
                },
                {
                  language: 'fr',
                  field: 'title',
                  value: 'AI Challenge 2023 (HCMC)',
                },
                {
                  language: 'en',
                  field: 'message',
                  value: '<p>Consolation prize.</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value: '<p>Giải khuyến khích.</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value: '<p>Prix de consolation.</p>',
                },
              ],
            },
          },
        ],
      },
    },
  });

  // Seed high school education
  await prisma.education.create({
    data: {
      userId: user.id,
      timeline: '2018 - 2020',
      title: 'High School Diploma',
      message:
        '<p>Studied at <strong>Phan Chau Trinh High School, Da Nang</strong>.</p>',
      icon: '/images/about/education/pct.png',
      translations: {
        create: [
          { language: 'en', field: 'title', value: 'High School Diploma' },
          {
            language: 'vi',
            field: 'title',
            value: 'Bằng Tốt nghiệp Trung học Phổ thông',
          },
          {
            language: 'fr',
            field: 'title',
            value: "Diplôme de fin d'études secondaires",
          },
          {
            language: 'en',
            field: 'message',
            value:
              '<p>Studied at <strong>Phan Chau Trinh High School, Da Nang</strong>.</p>',
          },
          {
            language: 'vi',
            field: 'message',
            value:
              '<p>Học tại <strong>Trường THPT Phan Châu Trinh, Đà Nẵng</strong>.</p>',
          },
          {
            language: 'fr',
            field: 'message',
            value:
              '<p>Étudié au <strong>Lycée Phan Châu Trinh, Đà Nẵng</strong>.</p>',
          },
        ],
      },
      subItems: {
        create: [
          {
            title: 'Vietnam National High School Graduation Examination',
            message: '<p>Scored <strong>28.65 / 30.00</strong>.</p>',
            translations: {
              create: [
                {
                  language: 'en',
                  field: 'title',
                  value: 'Vietnam National High School Graduation Examination',
                },
                {
                  language: 'vi',
                  field: 'title',
                  value: 'Kỳ thi Tốt nghiệp THPT Quốc gia',
                },
                {
                  language: 'fr',
                  field: 'title',
                  value:
                    "Examen National de Fin d'Études Secondaires (Vietnam)",
                },
                {
                  language: 'en',
                  field: 'message',
                  value: '<p>Scored <strong>28.65 / 30.00</strong>.</p>',
                },
                {
                  language: 'vi',
                  field: 'message',
                  value: '<p>Đạt <strong>28.65 / 30.00</strong> điểm.</p>',
                },
                {
                  language: 'fr',
                  field: 'message',
                  value: '<p>Score de <strong>28.65 / 30.00</strong>.</p>',
                },
              ],
            },
          },
        ],
      },
    },
  });
}

async function seedTechstacks(user: User) {
  const techStacks = [
    // Frameworks
    {
      userId: user.id,
      name: 'Gin',
      group: 'Frameworks',
      logo: '/images/about/techstacks/gin.png',
    },
    {
      userId: user.id,
      name: 'gRPC',
      group: 'Frameworks',
      logo: '/images/about/techstacks/grpc.png',
    },
    {
      userId: user.id,
      name: 'Node.js',
      group: 'Frameworks',
      logo: '/images/about/techstacks/nodejs.png',
    },
    {
      userId: user.id,
      name: 'FastAPI',
      group: 'Frameworks',
      logo: '/images/about/techstacks/fastapi.png',
    },
    {
      userId: user.id,
      name: 'Next.js',
      group: 'Frameworks',
      logo: '/images/about/techstacks/next-js.png',
    },

    {
      userId: user.id,
      name: 'Prisma',
      group: 'Frameworks',
      logo: '/images/about/techstacks/prisma.png',
    },
    // Libraries
    {
      userId: user.id,
      name: 'React.js',
      group: 'Libraries',
      logo: '/images/about/techstacks/react-js.png',
    },
    {
      userId: user.id,
      name: 'Float UI',
      group: 'Libraries',
      logo: '/images/about/techstacks/floating-ui.png',
    },
    {
      userId: user.id,
      name: 'Ant Design',
      group: 'Libraries',
      logo: '/images/about/techstacks/antd.png',
    },
    {
      userId: user.id,
      name: 'Framer Motion',
      group: 'Libraries',
      logo: '/images/about/techstacks/framer-motion.png',
    },
    {
      userId: user.id,
      name: 'React Bits',
      group: 'Libraries',
      logo: '/images/about/techstacks/react-bits.png',
    },

    {
      userId: user.id,
      name: 'next-intl',
      group: 'Libraries',
      logo: '/images/about/techstacks/next-intl.png',
    },

    // Programming Languages
    {
      userId: user.id,
      name: 'Go',
      group: 'Programming Languages',
      logo: '/images/about/techstacks/go.png',
    },
    {
      userId: user.id,
      name: 'Python',
      group: 'Programming Languages',
      logo: '/images/about/techstacks/python.png',
    },
    {
      userId: user.id,
      name: 'Typescript',
      group: 'Programming Languages',
      logo: '/images/about/techstacks/typescript.png',
    },
    {
      userId: user.id,
      name: 'Javascript',
      group: 'Programming Languages',
      logo: '/images/about/techstacks/javascript.png',
    },

    // Database
    {
      userId: user.id,
      name: 'MongoDB',
      group: 'Database',
      logo: '/images/about/techstacks/mongodb.png',
    },
    {
      userId: user.id,
      name: 'PostgreSQL',
      group: 'Database',
      logo: '/images/about/techstacks/postgresql.png',
    },
    {
      userId: user.id,
      name: 'Redis',
      group: 'Database',
      logo: '/images/about/techstacks/redis.png',
    },

    // AI & Vector Databases
    {
      userId: user.id,
      name: 'PyTorch',
      group: 'AI',
      logo: '/images/about/techstacks/pytorch.png',
    },
    {
      userId: user.id,
      name: 'HuggingFace',
      group: 'AI',
      logo: '/images/about/techstacks/hugging-face.png',
    },
    {
      userId: user.id,
      name: 'Jina AI',
      group: 'AI',
      logo: '/images/about/techstacks/jina.png',
    },
  ];

  return await prisma.techStack.createMany({
    data: techStacks.map((ts) => ({
      ...ts,
    })),
    skipDuplicates: true,
  });
}

async function seedExperiences(user: User) {
  // Lấy danh sách tech stack đã seed để liên kết
  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  // Tạo map để tra cứu tech stack ID theo tên
  const techStackMap = new Map(techStacks.map((ts) => [ts.name, ts.id]));

  const experiences = [
    {
      userId: user.id,
      company: 'Amiras',
      logoUrl: '/images/experiences/amiras.png',
      location: 'Ho Chi Minh, Vietnam',
      type: 'Full-time',
      description:
        'Worked as a Fullstack Developer, focusing on Loyalty system maintenance and feature development.',
      roles: [
        {
          title: 'Software Engineer - Junior',
          startDate: new Date('2024-03-01'),
          endDate: null,
          tasks: [
            'Writed reusable Go Package for HTTP Server & gRPC',
            'Writed Bi-directional End-to-End encryption plugin for client & server',
            'Writed translation service',
            'Integrated RESTful & GraphQL APIs.',
            'Optimized SSR, CSR, SSG, ISR.',
            'Developed frontend with Next.js.',
            'Optimized MongoDB queries.',
            'Used Redis for caching.',
            'Designed batch processing for scalability.',
          ],
        },
      ],
      techStackNames: [
        'Go',
        'Node.js',
        'Gin',
        'gRPC',
        'React.js',
        'Next.js',
        'MongoDB',
        'Redis',
        'FastAPI',
      ],
      translations: [
        { language: 'en', field: 'company', value: 'Amiras' },
        { language: 'vi', field: 'company', value: 'Amiras' },
        { language: 'fr', field: 'company', value: 'Amiras' },
        {
          language: 'en',
          field: 'description',
          value:
            'Worked as a Fullstack Developer, focusing on Loyalty system maintenance and feature development.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Làm việc với vai trò Fullstack Developer, tập trung vào bảo trì và phát triển tính năng cho hệ thống Loyalty.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Travaillé en tant que développeur Fullstack, axé sur la maintenance et le développement de fonctionnalités du système Loyalty.',
        },
        {
          language: 'en',
          field: 'role_title_Software Engineer - Junior',
          value: 'Software Engineer - Junior',
        },
        {
          language: 'vi',
          field: 'role_title_Software Engineer - Junior',
          value: 'Kỹ sư phần mềm - Junior',
        },
        {
          language: 'fr',
          field: 'role_title_Software Engineer - Junior',
          value: 'Ingénieur logiciel - Junior',
        },
        // Bản dịch cho tasks
        ...[
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_0',
            value: 'Wrote reusable Go package for HTTP Server & gRPC.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_0',
            value: 'Viết package Go tái sử dụng cho HTTP Server & gRPC.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_0',
            value:
              'Développé un package Go réutilisable pour HTTP Server et gRPC.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_1',
            value: 'Wrote bi-directional end-to-end encryption plugin.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_1',
            value: 'Viết plugin mã hóa hai chiều đầu cuối.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_1',
            value:
              'Développé un plugin de chiffrement bidirectionnel de bout en bout.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_2',
            value: 'Wrote translation service.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_2',
            value: 'Viết dịch vụ dịch ngôn ngữ.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_2',
            value: 'Développé un service de traduction.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_3',
            value: 'Integrated RESTful & GraphQL APIs.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_3',
            value: 'Tích hợp API RESTful & GraphQL.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_3',
            value: 'Intégration d’API RESTful et GraphQL.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_4',
            value: 'Optimized SSR, CSR, SSG, ISR.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_4',
            value: 'Tối ưu hóa SSR, CSR, SSG, ISR.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_4',
            value: 'Optimisation de SSR, CSR, SSG, ISR.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_5',
            value: 'Developed frontend with Next.js.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_5',
            value: 'Phát triển frontend bằng Next.js.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_5',
            value: 'Développement frontend avec Next.js.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_6',
            value: 'Optimized MongoDB queries.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_6',
            value: 'Tối ưu hóa truy vấn MongoDB.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_6',
            value: 'Optimisation des requêtes MongoDB.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_7',
            value: 'Used Redis for caching.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_7',
            value: 'Sử dụng Redis để caching.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_7',
            value: 'Utilisation de Redis pour la mise en cache.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Junior_8',
            value: 'Designed batch processing for scalability.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Junior_8',
            value: 'Thiết kế xử lý hàng loạt để mở rộng.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Junior_8',
            value: 'Conception du traitement par lots pour l’évolutivité.',
          },
        ],
      ],
    },
    {
      userId: user.id,
      company: 'Smart Loyalty',
      logoUrl: '/images/experiences/smart-loyalty.jpg',
      location: 'Ho Chi Minh, Vietnam',
      type: 'Full-time',
      description:
        'Developed React component library and Next.js apps with performance optimization.',
      roles: [
        {
          title: 'Software Engineer - Intern 2',
          startDate: new Date('2023-11-30'),
          endDate: new Date('2024-02-29'),
          tasks: [
            'Wrote cryptography Go package.',
            'Wrote Golang packages for Redis, MongoDB.',
            'Built notification service with gRPC.',
          ],
        },
        {
          title: 'Software Engineer - Intern 1',
          startDate: new Date('2023-08-01'),
          endDate: new Date('2023-11-30'),
          tasks: [
            'Built React component library.',
            'Developed Next.js apps with SSR, CSR, ISR.',
          ],
        },
      ],
      techStackNames: ['React.js', 'Next.js', 'Go', 'MongoDB'],
      translations: [
        { language: 'en', field: 'company', value: 'Smart Loyalty' },
        { language: 'vi', field: 'company', value: 'Smart Loyalty' },
        { language: 'fr', field: 'company', value: 'Smart Loyalty' },
        {
          language: 'en',
          field: 'description',
          value:
            'Developed React component library and Next.js apps with performance optimization.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Phát triển thư viện thành phần React và ứng dụng Next.js với tối ưu hóa hiệu suất.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Développé une bibliothèque de composants React et des applications Next.js avec optimisation des performances.',
        },
        // Bản dịch cho role titles
        {
          language: 'en',
          field: 'role_title_Software Engineer - Intern 2',
          value: 'Software Engineer - Intern 2',
        },
        {
          language: 'vi',
          field: 'role_title_Software Engineer - Intern 2',
          value: 'Kỹ sư phần mềm - Thực tập 2',
        },
        {
          language: 'fr',
          field: 'role_title_Software Engineer - Intern 2',
          value: 'Ingénieur logiciel - Stagiaire 2',
        },
        {
          language: 'en',
          field: 'role_title_Software Engineer - Intern 1',
          value: 'Software Engineer - Intern 1',
        },
        {
          language: 'vi',
          field: 'role_title_Software Engineer - Intern 1',
          value: 'Kỹ sư phần mềm - Thực tập 1',
        },
        {
          language: 'fr',
          field: 'role_title_Software Engineer - Intern 1',
          value: 'Ingénieur logiciel - Stagiaire 1',
        },
        // Bản dịch cho tasks của Software Engineer - Intern 2
        ...[
          {
            language: 'en',
            field: 'task_Software Engineer - Intern 2_0',
            value: 'Wrote cryptography Go package.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Intern 2_0',
            value: 'Viết package Go cho mã hóa.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Intern 2_0',
            value: 'Développé un package Go pour le chiffrement.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Intern 2_1',
            value: 'Wrote Golang packages for Redis, MongoDB.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Intern 2_1',
            value: 'Viết package Golang cho Redis, MongoDB.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Intern 2_1',
            value: 'Développé des packages Golang pour Redis et MongoDB.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Intern 2_2',
            value: 'Built notification service with gRPC.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Intern 2_2',
            value: 'Xây dựng dịch vụ thông báo bằng gRPC.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Intern 2_2',
            value: 'Création d’un service de notification avec gRPC.',
          },
        ],
        // Bản dịch cho tasks của Software Engineer - Intern 1
        ...[
          {
            language: 'en',
            field: 'task_Software Engineer - Intern 1_0',
            value: 'Built React component library.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Intern 1_0',
            value: 'Xây dựng thư viện React Components.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Intern 1_0',
            value: 'Création d’une bibliothèque de composants React.',
          },
          {
            language: 'en',
            field: 'task_Software Engineer - Intern 1_1',
            value: 'Developed Next.js apps with SSR, CSR, ISR.',
          },
          {
            language: 'vi',
            field: 'task_Software Engineer - Intern 1_1',
            value: 'Phát triển ứng dụng Next.js với SSR, CSR, ISR.',
          },
          {
            language: 'fr',
            field: 'task_Software Engineer - Intern 1_1',
            value: 'Développement d’applications Next.js avec SSR, CSR, ISR.',
          },
        ],
      ],
    },
  ];

  // Tạo experiences
  for (const exp of experiences) {
    const createdExp = await prisma.experience.create({
      data: {
        userId: exp.userId,
        company: exp.company,
        logoUrl: exp.logoUrl,
        location: exp.location,
        type: exp.type,
        description: exp.description,
        roles: {
          create: exp.roles.map((role) => ({
            title: role.title,
            startDate: role.startDate,
            endDate: role.endDate,
          })),
        },
        techstacks: {
          create: exp.techStackNames.map((name) => ({
            techstackId: techStackMap.get(name)!,
          })),
        },
        translations: {
          create: exp.translations,
        },
      },
    });

    // Tạo tasks riêng cho mỗi role
    for (const role of exp.roles) {
      const createdRole = await prisma.experienceRole.findFirst({
        where: { title: role.title, experienceId: createdExp.id },
      });
      if (createdRole) {
        await prisma.task.createMany({
          data: role.tasks.map((task, idx) => ({
            experienceRoleId: createdRole.id,
            content: task,
          })),
        });
      }
    }
  }

  return prisma.experience.findMany({
    where: { userId: user.id },
    include: {
      roles: { include: { tasks: true } },
      techstacks: { include: { techstack: true } },
      translations: true,
    },
  });
}

async function seedTags(user: User) {
  const tags = [
    {
      name: 'defaults',
    },
    {
      name: 'struct-tag',
    },
    {
      name: 'logging',
    },
    {
      name: 'structured-logging',
    },
    {
      name: 'translator',
    },
    {
      name: 'service',
    },
    {
      name: 'portfolio',
    },
    {
      name: 'open-source',
    },
    {
      name: 'developer-journey',
    },
    {
      name: 'multilingual',
    },
    {
      name: 'Vision-Language Model',
    },
    {
      name: 'Medical image',
    },
    {
      name: 'Anomaly Detection',
    },
  ];

  for (const tag of tags) {
    const createdTag = await prisma.tag.create({
      data: {
        name: tag.name,
      },
    });
  }
}

async function seedCoauthor() {
  const coauthors = [
    {
      fullname: 'Vũ Văn Thái',
      email: '20120579@student.hcmus.edu.vn',
    },
  ];
  const res: Coauthor[] = [];
  for (const coauthor of coauthors) {
    const r = await prisma.coauthor.create({
      data: {
        ...coauthor,
      },
    });
    res.push(r);
  }
  return res;
}

async function seedProjects(user: User, coauthors: Coauthor[]) {
  // Lấy danh sách tech stack đã seed để liên kết
  const techStacks = await prisma.techStack.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  const tags = await prisma.tag.findMany({
    select: { id: true, name: true },
  });

  // Tạo map để tra cứu tech stack ID theo tên
  const techStackMap = new Map(techStacks.map((ts) => [ts.name, ts.id]));
  const tagMap = new Map(tags.map((ts) => [ts.name, ts.id]));
  const coauthorMap = new Map(coauthors.map((ts) => [ts.fullname, ts.id]));

  const projects = [
    {
      userId: user.id,
      title: 'go-defaults',
      description:
        'The defaults package simplifies the process of setting default values for struct fields in Go when they are unset (i.e., at their zero value or nil for pointers). Instead of manually checking each field for its zero value and assigning defaults, defaults uses struct tags to automatically parse and set default values, making your code cleaner and more maintainable.',
      githubLink: 'https://github.com/lthphuw/go-defaults',
      liveLink: '',
      techStackNames: ['Go'],
      tagNames: ['open-source', 'defaults', 'struct-tag'],
      coauthor: [],
      translations: [
        {
          language: 'en',
          field: 'description',
          value:
            'The defaults package simplifies the process of setting default values for struct fields in Go when they are unset (i.e., at their zero value or nil for pointers). Instead of manually checking each field for its zero value and assigning defaults, defaults uses struct tags to automatically parse and set default values, making your code cleaner and more maintainable.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Gói defaults đơn giản hóa việc đặt giá trị mặc định cho các trường struct trong Go khi chúng chưa được thiết lập (tức là ở giá trị zero hoặc nil đối với con trỏ). Thay vì kiểm tra thủ công từng trường để tìm giá trị zero và gán giá trị mặc định, defaults sử dụng struct tags để tự động phân tích và đặt giá trị mặc định, giúp mã của bạn gọn gàng và dễ bảo trì hơn.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Le package defaults simplifie le processus de définition des valeurs par défaut pour les champs de struct dans Go lorsqu’ils ne sont pas définis (c’est-à-dire à leur valeur zéro ou nil pour les pointeurs). Au lieu de vérifier manuellement chaque champ pour sa valeur zéro et d’assigner des valeurs par défaut, defaults utilise des struct tags pour analyser et définir automatiquement les valeurs par défaut, rendant votre code plus propre et plus facile à maintenir.',
        },
      ],
    },
    {
      userId: user.id,
      title: 'plogger',
      description:
        'A lightweight logger for Go with structured output and pluggable formatter/writer.',
      githubLink: 'https://github.com/lthphuw/plogger',
      liveLink: '',
      techStackNames: ['Go'],
      tagNames: ['open-source', 'logging', 'structured-logging'],
      coauthor: [],
      translations: [
        {
          language: 'en',
          field: 'description',
          value:
            'A lightweight logger for Go with structured output and pluggable formatter/writer.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Một logger nhẹ cho Go với đầu ra có cấu trúc và formatter/writer có thể cắm thêm.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Un logger léger pour Go avec une sortie structurée et un formatter/writer enfichable.',
        },
      ],
    },
    {
      userId: user.id,
      title: 'Translator as a Service',
      description:
        'A lightweight API for translating between English, Vietnamese, and French using pretrained models. Supports auto language detection and can be easily extended to other language pairs.',
      githubLink: 'https://github.com/lthphuw/translator-as-service',
      liveLink: '',
      techStackNames: ['Python', 'FastAPI'],
      tagNames: ['open-source', 'translator', 'service'],
      coauthor: [],
      translations: [
        {
          language: 'en',
          field: 'description',
          value:
            'A lightweight API for translating between English, Vietnamese, and French using pretrained models. Supports auto language detection and can be easily extended to other language pairs.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Một API nhẹ để dịch giữa tiếng Anh, tiếng Việt và tiếng Pháp bằng các mô hình pretrained. Hỗ trợ phát hiện ngôn ngữ tự động và có thể dễ dàng mở rộng sang các cặp ngôn ngữ khác.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Une API légère pour traduire entre l’anglais, le vietnamien et le français à l’aide de modèles pretrained. Prend en charge la détection automatique de la langue et peut être facilement étendue à d’autres paires de langues.',
        },
      ],
    },
    {
      userId: user.id,
      title: 'Byte of me',
      description:
        'My digital garden — where thoughts, code, and growth converge.',
      githubLink: 'https://github.com/lthphuw/byte-of-me',
      liveLink: 'https://phu-lth.space/',
      coauthor: [],
      techStackNames: [
        'Next.js',
        'React.js',
        'Float UI',
        'Framer Motion',
        'React Bits',
        'next-intl',
        'Prisma',
        'Typescript',
        'PostgreSQL',
      ],
      tagNames: [
        'portfolio',
        'open-source',
        'developer-journey',
        'multilingual',
      ],
      translations: [
        {
          language: 'en',
          field: 'description',
          value:
            'My digital garden — where thoughts, code, and growth converge.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Không gian cá nhân – nơi hội tụ ý tưởng, code và sự trưởng thành của bản thân.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Mon espace personnel — où convergent pensées, code et évolution personnelle.',
        },
      ],
    },
    {
      userId: user.id,
      title:
        'MLA-LP: Multi-Level Adapters with Learnable Prompt for Medical Image Anomaly Detection',
      description:
        'The MLA-LP model leverages the pre-trained CLIP vision-language model, enhanced with multi-level adapters and learnable prompts, to address the challenge of detecting and segmenting abnormalities in medical images. The model excels in both zero-shot and few-shot learning scenarios, achieving superior performance in anomaly classification (AC) and anomaly segmentation (AS) tasks across diverse medical imaging datasets.',
      githubLink: 'https://github.com/vvthai10/mla-pl',
      liveLink: '',
      techStackNames: ['Python', 'PyTorch'],
      coauthor: ['Vũ Văn Thái'],
      tagNames: [
        'open-source',
        'Vision-Language Model',
        'Medical image',
        'Anomaly Detection',
      ],
      translations: [
        {
          language: 'en',
          field: 'description',
          value:
            'The MLA-LP model leverages the pre-trained CLIP vision-language model, enhanced with multi-level adapters and learnable prompts, to address the challenge of detecting and segmenting abnormalities in medical images. The model excels in both zero-shot and few-shot learning scenarios, achieving superior performance in anomaly classification (AC) and anomaly segmentation (AS) tasks across diverse medical imaging datasets.',
        },
        {
          language: 'vi',
          field: 'description',
          value:
            'Mô hình MLA-LP tận dụng mô hình vision-language CLIP được huấn luyện trước, được cải tiến với multi-level adapters và learnable prompts, để giải quyết thách thức trong việc phát hiện và phân đoạn các bất thường trong hình ảnh y khoa. Mô hình này nổi bật trong cả hai kịch bản zero-shot và few-shot learning, đạt được hiệu suất vượt trội trong các nhiệm vụ anomaly classification (AC) và anomaly segmentation (AS) trên nhiều tập dữ liệu hình ảnh y khoa đa dạng.',
        },
        {
          language: 'fr',
          field: 'description',
          value:
            'Le modèle MLA-LP exploite le modèle vision-language CLIP pré-entraîné, amélioré avec des multi-level adapters et des learnable prompts, pour relever le défi de la détection et de la segmentation des anomalies dans les images médicales. Le modèle excelle dans les scénarios de zero-shot et few-shot learning, offrant des performances supérieures dans les tâches d’anomaly classification (AC) et d’anomaly segmentation (AS) sur divers ensembles de données d’imagerie médicale.',
        },
      ],
    },
  ];

  for (const proj of projects) {
    const createdProj = await prisma.project.create({
      data: {
        userId: proj.userId,
        title: proj.title,
        description: proj.description,
        githubLink: proj.githubLink,
        liveLink: proj.liveLink,
        coauthors: {
          create: proj.coauthor.map((name) => ({
            coauthorID: coauthorMap.get(name)!,
          })),
        },
        techstacks: {
          create: proj.techStackNames.map((name) => ({
            techstackId: techStackMap.get(name)!,
          })),
        },
        tags: {
          create: proj.tagNames.map((name) => ({
            tagId: tagMap.get(name)!,
          })),
        },
        translations: {
          create: proj.translations,
        },
      },
    });
  }
}
