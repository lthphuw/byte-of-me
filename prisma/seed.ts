import { PrismaClient } from "@/generated/prisma/client"
import * as dotenv from "dotenv"

dotenv.config()
const prisma = new PrismaClient()

async function safeDeleteMany(model: any, modelName: string) {
    try {
        await model.deleteMany()
        console.log(`Cleared ${modelName} table`)
    } catch (error) {
        console.warn(
            `Warning: Failed to clear ${modelName} table. It may not exist yet.`
        )
    }
}

async function main(): Promise<void> {
    console.log("Seeding database...")

    // Clear data in correct order with safe deletion
    await safeDeleteMany(prisma.blogTag, "BlogTag")
    await safeDeleteMany(prisma.experienceTechnology, "ExperienceTechnology")
    await safeDeleteMany(prisma.projectTechStack, "ProjectTechStack")
    await safeDeleteMany(prisma.projectImage, "ProjectImage")
    await safeDeleteMany(prisma.educationSubItem, "EducationSubItem")
    await safeDeleteMany(prisma.translation, "Translation")
    await safeDeleteMany(prisma.blog, "Blog")
    await safeDeleteMany(prisma.project, "Project")
    await safeDeleteMany(prisma.experience, "Experience")
    await safeDeleteMany(prisma.education, "Education")
    await safeDeleteMany(prisma.tag, "Tag")
    await safeDeleteMany(prisma.technology, "Technology")
    await safeDeleteMany(prisma.techStack, "TechStack")
    await safeDeleteMany(prisma.userBannerImage, "UserImageBanner")
    await safeDeleteMany(prisma.user, "User")

    // Seed user
    const user = await prisma.user.create({
        data: {
            name: "Luong Thanh Phu Hoang",
            firstName: "Phu",
            lastName: "Luong Thanh Hoang",
            birthdate: "2002-11-20",
            greeting: "Hi, I'm Phu",
            tagLine: "Code, career, controller — one byte at a time.",
            email: "lthphuw@gmail.com",
            image: "/images/avatars/HaNoi2024.jpeg",
            imageCaption:
                "Taken at the Vietnam Military History Museum, this 2024 painting is titled “Sống bám đá, chết hoá đá” — “Cling to rocks in life, turn to stone in death.”",
            quote: `
            I enjoy learning new things and have a strong interest in open - source projects, where I often discover useful ideas and best practices.These experiences help me build better and more efficient solutions. For me, growth doesn’t just come from work—it also comes from self - exploration and continuous learning.That’s what truly drives my development.`,
            bio: "A passionate developer exploring the world of open-source and modern web technologies.",
            aboutMe: `
                <p>Hi, I'm Phu, a <strong>software developer</strong> with a passion for building <em>modern web applications</em>.</p>
                <p>I specialize in <a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a> and <a href="https://go.dev" target="_blank" rel="noopener noreferrer">Go</a>, and love contributing to open-source projects.</p>
                <ul>
                    <li>Based in Ho Chi Minh City, Vietnam</li>
                    <li>Graduated from University of Science, VNU-HCM</li>
                    <li>Hobby: Exploring new tech and gaming</li>
                </ul>
            `,
            linkedIn: "www.linkedin.com/in/phu-lth",
            github: "https://github.com/lthphuw",
            translations: {
                create: [
                    { language: "en", field: "greeting", value: "Hi, I'm Phu" },
                    { language: "vi", field: "greeting", value: "Chào, tôi là Phú" },
                    { language: "fr", field: "greeting", value: "Salut, je suis Phu" },
                    {
                        language: "en",
                        field: "tagLine",
                        value: "Code, career, controller — one byte at a time.",
                    },
                    {
                        language: "vi",
                        field: "tagLine",
                        value: "Lập trình, sự nghiệp, sở thích — từng byte một.",
                    },
                    {
                        language: "fr",
                        field: "tagLine",
                        value: "Code, carrière, contrôleur — un octet à la fois.",
                    },

                    {
                        language: "en",
                        field: "imageCaption",
                        value:
                            "Taken at the Vietnam Military History Museum, this 2024 painting is titled  “Sống bám đá, chết hoá đá” - “Cling to rocks in life, turn to stone in death.”",
                    },
                    {
                        language: "vi",
                        field: "imageCaption",
                        value:
                            "Chụp tại Bảo tàng Lịch sử Quân sự Việt Nam, bức tranh năm 2024 có tiêu đề “Sống bám đá, chết hoá đá.”",
                    },
                    {
                        language: "fr",
                        field: "imageCaption",
                        value:
                            "Pris au Musée d'Histoire Militaire du Vietnam, ce tableau de 2024 est intitulé “Sống bám đá, chết hoá đá” — “ S'accrocher aux rochers dans la vie, se transformer en pierre dans la mort. ”",
                    },
                    {
                        language: "en",
                        field: "quote",
                        value:
                            "I enjoy learning new things and have a strong interest in open - source projects, where I often discover useful ideas and best practices.These experiences help me build better and more efficient solutions. \nFor me, growth doesn’t just come from work—it also comes from self - exploration and continuous learning.That’s what truly drives my development.",
                    },
                    {
                        language: "vi",
                        field: "quote",
                        value:
                            "Tôi thích học hỏi những điều mới và có hứng thú mạnh mẽ với các dự án mã nguồn mở, nơi tôi thường tìm thấy những ý tưởng hữu ích và các phương pháp hay nhất. Những trải nghiệm này giúp tôi xây dựng các giải pháp tốt hơn và hiệu quả hơn. \nĐối với tôi, sự phát triển không chỉ đến từ công việc—mà còn từ việc tự khám phá và học tập không ngừng. Đó là điều thực sự thúc đẩy sự phát triển của tôi.",
                    },
                    {
                        language: "fr",
                        field: "quote",
                        value:
                            "J'aime apprendre de nouvelles choses et j'ai un fort intérêt pour les projets open-source, où je découvre souvent des idées utiles et des meilleures pratiques. Ces expériences m'aident à construire des solutions meilleures et plus efficaces. \nPour moi, la croissance ne vient pas seulement du travail, mais aussi de l'auto-exploration et de l'apprentissage continu. C'est ce qui motive véritablement mon développement.",
                    },
                    {
                        language: "en",
                        field: "bio",
                        value:
                            "A passionate developer exploring the world of open-source and modern web technologies.",
                    },
                    {
                        language: "vi",
                        field: "bio",
                        value:
                            "Một lập trình viên đam mê khám phá thế giới mã nguồn mở và công nghệ web hiện đại.",
                    },
                    {
                        language: "fr",
                        field: "bio",
                        value:
                            "Un développeur passionné explorant le monde de l'open-source et des technologies web modernes.",
                    },
                    {
                        language: "en",
                        field: "aboutMe",
                        value: `
                       <p> I'm a junior full-stack developer, primarily focused on backend development. I enjoy building scalable, high-performance systems and have hands-on experience with Golang, Node.js, and Python. While my main focus is backend, I’ve also worked with frontend technologies like React.js and Next.js. I have experience in researching and developing AI models, and I'm always eager to learn and grow through real-world projects.</p>
                        <p>In the future, I aim to deepen my expertise in system design, distributed systems, and AI integration — building reliable, efficient, and intelligent software at scale.</p>
                    `,
                    },
                    {
                        language: "vi",
                        field: "aboutMe",
                        value: `
                    <p>
                    Tôi là một lập trình viên full-stack (junior), chủ yếu tập trung vào phát triển backend. Tôi thích xây dựng các hệ thống hiệu suất cao, có khả năng mở rộng và có kinh nghiệm thực tế với Golang, Node.js và Python. Mặc dù trọng tâm chính là backend, tôi cũng đã làm việc với các công nghệ frontend như React.js và Next.js. Tôi có kinh nghiệm nghiên cứu và phát triển các mô hình AI, và luôn háo hức học hỏi và phát triển qua các dự án thực tế.
                    </p> 
                    <p>
                    Trong tương lai, tôi hướng đến việc nâng cao chuyên môn trong thiết kế hệ thống, hệ thống phân tán và tích hợp AI — xây dựng phần mềm đáng tin cậy, hiệu quả và thông minh ở quy mô lớn.
                    </p>
                    `,
                    },
                    {
                        language: "fr",
                        field: "aboutMe",
                        value: `
                       <p>Je suis un développeur full-stack junior, principalement axé sur le développement backend. J'aime construire des systèmes performants et évolutifs, avec une expérience pratique en Golang, Node.js et Python. Bien que mon focus principal soit le backend, j'ai également travaillé avec des technologies frontend comme React.js et Next.js. J'ai de l'expérience dans la recherche et le développement de modèles d'IA, et je suis toujours eager d'apprendre et de progresser à travers des projets concrets.</p>
                       <p>À l'avenir, je vise à approfondir mon expertise en conception de systèmes, systèmes distribués et intégration d'IA — en construisant des logiciels fiables, efficaces et intelligents à grande échelle.</p>
                    `,
                    },
                ],
            },
        },
    })


    // Tạo banner image 3
    await prisma.userBannerImage.create({
        data: {
            userId: user.id,
            src: "/images/banners/image3.jpeg",
            caption: "",
            translations: {
                create: [
                    {
                        language: "vi",
                        field: "caption",
                        value: "Trình bày bài báo khoa học đầu tiên về 'Phát hiện bất thường trong ảnh y khoa dựa trên mô hình Ngôn ngữ-Ảnh' tại workshop CV4DC 2024.",
                    },
                    {
                        language: "en",
                        field: "caption",
                        value: "Presented the first scientific paper on 'Anomaly Detection in Medical Images Using Language-Vision Models' at the CV4DC 2024 workshop.",
                    },
                    {
                        language: "fr",
                        field: "caption",
                        value: "Présentation du premier article scientifique sur 'Détection d'anomalies dans les images médicales à l'aide de modèles Langage-Vision' lors de l'atelier CV4DC 2024.",
                    },
                ],
            },
        },
    });

    // Tạo banner image 2
    await prisma.userBannerImage.create({
        data: {
            userId: user.id,
            src: "/images/banners/image2.jpeg",
            caption: "",
            translations: {
                create: [
                    {
                        language: "vi",
                        field: "caption",
                        value: "Chụp tại Quảng trường Ba Đình, Hà Nội năm 2024.",
                    },
                    {
                        language: "en",
                        field: "caption",
                        value: "Taken at Ba Đình Square, Hanoi, in 2024.",
                    },
                    {
                        language: "fr",
                        field: "caption",
                        value: "Prise à la Place Ba Đình, Hanoï, en 2024.",
                    },
                ],
            },
        },
    });

    // Tạo banner image 1
    await prisma.userBannerImage.create({
        data: {
            userId: user.id,
            src: "/images/banners/image1.jpeg",
            caption: "", // Giữ caption mặc định rỗng
            translations: {
                create: [
                    {
                        language: "vi",
                        field: "caption",
                        value: "Chụp tại Bảo tàng Lịch sử Quân sự Việt Nam, bức ảnh năm 2024 mang tên 'Sống bám đá, chết hóa đá.'",
                    },
                    {
                        language: "en",
                        field: "caption",
                        value: "Captured at the Vietnam Military History Museum, this 2024 photo is titled 'Sống bám đá, chết hóa đá.' - 'Live clinging to stone, die turning to stone.'",
                    },
                    {
                        language: "fr",
                        field: "caption",
                        value: "Prise au Musée d'Histoire Militaire du Vietnam, cette photo de 2024 est intitulée 'Sống bám đá, chết hóa đá.' - 'Vivre accroché à la pierre, mourir en pierre.'",
                    },
                ],
            },
        },
    });

    // Seed education
    await prisma.education.create({
        data: {
            userId: user.id,
            timeline: "2020 - 2024",
            title: "Bachelor of Science (Honors Program) in Information Technology",
            message: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                            <span>Studied at <strong>University of Science, VNU-HCM</strong>, focusing on Software Engineering and AI.</span>
                        <span>Participated in research projects and published papers.</span>
                        </div>
        `,
            icon: "/images/about/education/hcmus.png",
            translations: {
                create: [
                    {
                        language: "en",
                        field: "title",
                        value:
                            "Bachelor of Science (Honors Program) in Information Technology",
                    },
                    {
                        language: "vi",
                        field: "title",
                        value:
                            "Cử nhân Khoa học (Chương trình Tài năng) ngành Công nghệ Thông tin",
                    },
                    {
                        language: "fr",
                        field: "title",
                        value: "Licence en sciences (programme d'honneur) en informatique",
                    },
                    {
                        language: "en",
                        field: "message",
                        value: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                            <span>Studied at <strong>University of Science, VNU-HCM</strong>, focusing on Software Engineering and AI.</span>
                        <span>Participated in research projects and published papers.</span>
                        </div>
                    
                `,
                    },
                    {
                        language: "vi",
                        field: "message",
                        value: `
                        <div class="flex flex-col gap-1 text-sm leading-relaxed">
                    <span>Học tại <strong>Đại học Khoa học Tự nhiên, ĐHQG-HCM</strong>, tập trung vào Kỹ thuật Phần mềm và AI.</span>
                    <span>Tham gia các dự án nghiên cứu và công bố bài báo.</span>
                        </div>
                `,
                    },
                    {
                        language: "fr",
                        field: "message",
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
                        title: "Academic Performance",
                        message: "<p>Graduated with a GPA of <strong>8.67/10</strong>.</p>",
                        translations: {
                            create: [
                                {
                                    language: "en",
                                    field: "title",
                                    value: "Academic Performance",
                                },
                                { language: "vi", field: "title", value: "Thành tích học tập" },
                                {
                                    language: "fr",
                                    field: "title",
                                    value: "Performance académique",
                                },
                                {
                                    language: "en",
                                    field: "message",
                                    value:
                                        "<p>Graduated with a GPA of <strong>8.67/10</strong>.</p>",
                                },
                                {
                                    language: "vi",
                                    field: "message",
                                    value: "<p>Tốt nghiệp với GPA <strong>8.67/10</strong>.</p>",
                                },
                                {
                                    language: "fr",
                                    field: "message",
                                    value:
                                        "<p>Diplômé avec une moyenne de <strong>8.67/10</strong>.</p>",
                                },
                            ],
                        },
                    },
                    {
                        title: "Published Paper at CV4DC 2024",
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
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-white bg-blue-600 hover:bg-blue-700 rounded">
                                            [View Paper]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                        translations: {
                            create: [
                                {
                                    language: "en",
                                    field: "title",
                                    value: "Published Paper at CV4DC 2024",
                                },
                                {
                                    language: "vi",
                                    field: "title",
                                    value: "Xuất bản bài báo tại CV4DC 2024",
                                },
                                {
                                    language: "fr",
                                    field: "title",
                                    value: "Document publié sur CV4DC 2024",
                                },
                                {
                                    language: "en",
                                    field: "message",
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
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-white bg-blue-600 hover:bg-blue-700 rounded">
                                            [View Paper]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                                },
                                {
                                    language: "vi",
                                    field: "message",
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
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-white bg-blue-600 hover:bg-blue-700 rounded">
                                            [Xem bài báo]
                                          </a>
                                        </p>
                                      </div>
                                    `,
                                },
                                {
                                    language: "fr",
                                    field: "message",
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
                                          <a href="https://cv4dc.github.io/files/2024/papers/16.pdf" target="_blank" rel="noopener noreferrer" class="inline-block text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
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
                        title: "Thesis Score",
                        message: "<p>Thesis Score: <strong>10/10</strong> (Excellent).</p>",
                        translations: {
                            create: [
                                { language: "en", field: "title", value: "Thesis Score" },
                                { language: "vi", field: "title", value: "Điểm luận văn" },
                                { language: "fr", field: "title", value: "Score de thèse" },
                                {
                                    language: "en",
                                    field: "message",
                                    value:
                                        "<p>Thesis Score: <strong>10/10</strong> (Excellent).</p>",
                                },
                                {
                                    language: "vi",
                                    field: "message",
                                    value:
                                        "<p>Điểm luận văn: <strong>10/10</strong> (Xuất sắc).</p>",
                                },
                                {
                                    language: "fr",
                                    field: "message",
                                    value:
                                        "<p>Score de thèse : <strong>10/10</strong> (Excellent).</p>",
                                },
                            ],
                        },
                    },
                    {
                        title: "Outstanding Student Research Award",
                        message: "<p>Awarded for excellence in scientific research.</p>",
                        translations: {
                            create: [
                                {
                                    language: "en",
                                    field: "title",
                                    value: "Outstanding Student Research Award",
                                },
                                {
                                    language: "vi",
                                    field: "title",
                                    value: "Giải thưởng Sinh viên Nghiên cứu Xuất sắc",
                                },
                                {
                                    language: "fr",
                                    field: "title",
                                    value: "Prix de recherche étudiant exceptionnel",
                                },
                                {
                                    language: "en",
                                    field: "message",
                                    value:
                                        "<p>Awarded for excellence in scientific research.</p>",
                                },
                                {
                                    language: "vi",
                                    field: "message",
                                    value:
                                        "<p>Được trao giải vì xuất sắc trong nghiên cứu khoa học.</p>",
                                },
                                {
                                    language: "fr",
                                    field: "message",
                                    value:
                                        "<p>Récompensé pour l'excellence en recherche scientifique.</p>",
                                },
                            ],
                        },
                    },
                    {
                        title: "Top 6 Highest Entrance Exam Scorers",
                        message:
                            "<p>Ranked in the top 6 highest entrance exam scorers in 2020.</p>",
                        translations: {
                            create: [
                                {
                                    language: "en",
                                    field: "title",
                                    value: "Top 6 Highest Entrance Exam Scorers",
                                },
                                {
                                    language: "vi",
                                    field: "title",
                                    value: "Top 6 Thí sinh có điểm thi đầu vào cao nhất",
                                },
                                {
                                    language: "fr",
                                    field: "title",
                                    value: "Top 6 des meilleurs scores à l'examen d'entrée",
                                },
                                {
                                    language: "en",
                                    field: "message",
                                    value:
                                        "<p>Ranked in the top 6 highest entrance exam scorers in 2020.</p>",
                                },
                                {
                                    language: "vi",
                                    field: "message",
                                    value:
                                        "<p>Xếp trong top 6 thí sinh có điểm thi đầu vào cao nhất năm 2020.</p>",
                                },
                                {
                                    language: "fr",
                                    field: "message",
                                    value:
                                        "<p>Classé parmi les 6 meilleurs scores à l'examen d'entrée en 2020.</p>",
                                },
                            ],
                        },
                    },
                    {
                        title: "AI Challenge 2023 (HCMC)",
                        message: "<p>Consolation prize.</p>",
                        translations: {
                            create: [
                                {
                                    language: "en",
                                    field: "title",
                                    value: "AI Challenge 2023 (HCMC)",
                                },
                                {
                                    language: "vi",
                                    field: "title",
                                    value: "AI Challenge 2023 (HCMC)",
                                },
                                {
                                    language: "fr",
                                    field: "title",
                                    value: "AI Challenge 2023 (HCMC)",
                                },
                                {
                                    language: "en",
                                    field: "message",
                                    value: "<p>Consolation prize.</p>",
                                },
                                {
                                    language: "vi",
                                    field: "message",
                                    value: "<p>Giải khuyến khích.</p>",
                                },
                                {
                                    language: "fr",
                                    field: "message",
                                    value: "<p>Prix de consolation.</p>",
                                },
                            ],
                        },
                    },
                ],
            },
        },
    })

    // Seed high school education
    await prisma.education.create({
        data: {
            userId: user.id,
            timeline: "2018 - 2020",
            title: "High School Diploma",
            message:
                "<p>Studied at <strong>Phan Chau Trinh High School, Da Nang</strong>.</p>",
            icon: "/images/about/education/pct.png",
            translations: {
                create: [
                    { language: "en", field: "title", value: "High School Diploma" },
                    {
                        language: "vi",
                        field: "title",
                        value: "Bằng Tốt nghiệp Trung học Phổ thông",
                    },
                    {
                        language: "fr",
                        field: "title",
                        value: "Diplôme de fin d'études secondaires",
                    },
                    {
                        language: "en",
                        field: "message",
                        value:
                            "<p>Studied at <strong>Phan Chau Trinh High School, Da Nang</strong>.</p>",
                    },
                    {
                        language: "vi",
                        field: "message",
                        value:
                            "<p>Học tại <strong>Trường THPT Phan Châu Trinh, Đà Nẵng</strong>.</p>",
                    },
                    {
                        language: "fr",
                        field: "message",
                        value:
                            "<p>Étudié au <strong>Lycée Phan Châu Trinh, Đà Nẵng</strong>.</p>",
                    },
                ],
            },
        },
    })

    // Seed tech stacks
    const techStacks = [
        // Frameworks
        {
            userId: user.id,
            name: "Gin",
            group: "Frameworks",
            logo: "/images/about/techstacks/gin.png",
        },
        {
            userId: user.id,
            name: "gRPC",
            group: "Frameworks",
            logo: "/images/about/techstacks/grpc.png",
        },
        {
            userId: user.id,
            name: "Node.js",
            group: "Frameworks",
            logo: "/images/about/techstacks/nodejs.png",
        },
        {
            userId: user.id,
            name: "FastAPI",
            group: "Frameworks",
            logo: "/images/about/techstacks/fastapi.png",
        },
        {
            userId: user.id,
            name: "Next.js",
            group: "Frameworks",
            logo: "/images/about/techstacks/next-js.png",
        },

        // Libraries 
        {
            userId: user.id,
            name: "React.js",
            group: "Libraries",
            logo: "/images/about/techstacks/react-js.png",
        },
        {
            userId: user.id,
            name: "Float UI",
            group: "Libraries",
            logo: "/images/about/techstacks/floating-ui.png",
        },
        {
            userId: user.id,
            name: "Framer Motion",
            group: "Libraries",
            logo: "/images/about/techstacks/framer-motion.png",
        },
        {
            userId: user.id,
            name: "React Bits",
            group: "Libraries",
            logo: "/images/about/techstacks/react-bits.png",
        },

        // Programming Languages
        {
            userId: user.id,
            name: "Go",
            group: "Programming Languages",
            logo: "/images/about/techstacks/go.png",
        },
        {
            userId: user.id,
            name: "Python",
            group: "Programming Languages",
            logo: "/images/about/techstacks/python.png",
        },
        {
            userId: user.id,
            name: "Typescript",
            group: "Programming Languages",
            logo: "/images/about/techstacks/typescript.png",
        },
        {
            userId: user.id,
            name: "Javascript",
            group: "Programming Languages",
            logo: "/images/about/techstacks/javascript.png",
        },

        // Database
        {
            userId: user.id,
            name: "MongoDB",
            group: "Database",
            logo: "/images/about/techstacks/mongodb.png",
        },
        {
            userId: user.id,
            name: "PostgreSQL",
            group: "Database",
            logo: "/images/about/techstacks/postgresql.png",
        },
        {
            userId: user.id,
            name: "Redis",
            group: "Database",
            logo: "/images/about/techstacks/redis.png",
        },
    ]

    await prisma.techStack.createMany({
        data: techStacks.map((ts) => ({
            ...ts
        })),
        skipDuplicates: true,
    })

    // // Seed translations for tech stacks
    // for (const ts of techStacks) {
    //     const techStack = await prisma.techStack.findFirst({
    //         where: { name: ts.name },
    //     })
    //     if (techStack) {
    //         await prisma.translation.createMany({
    //             data: [
    //                 {
    //                     language: "en",
    //                     field: `techStack.${ts.name}.name`,
    //                     value: ts.name,
    //                     techStackId: techStack.id,
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: `techStack.${ts.name}.name`,
    //                     value: ts.name,
    //                     techStackId: techStack.id,
    //                 },
    //             ],
    //             skipDuplicates: true,
    //         })
    //     }
    // }

    // // Seed technologies
    // const technologies = [
    //     { name: "React" },
    //     { name: "Node.js" },
    //     { name: "MongoDB" },
    // ]

    // await prisma.technology.createMany({
    //     data: technologies.map((tech) => ({ name: tech.name })),
    //     skipDuplicates: true,
    // })

    // // Seed translations for technologies
    // for (const tech of technologies) {
    //     const technology = await prisma.technology.findFirst({
    //         where: { name: tech.name },
    //     })
    //     if (technology) {
    //         await prisma.translation.createMany({
    //             data: [
    //                 {
    //                     language: "en",
    //                     field: `technology.${tech.name}.name`,
    //                     value: tech.name,
    //                     technologyId: technology.id,
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: `technology.${tech.name}.name`,
    //                     value: tech.name,
    //                     technologyId: technology.id,
    //                 },
    //             ],
    //             skipDuplicates: true,
    //         })
    //     }
    // }

    // Seed experience
    // await prisma.experience.create({
    //     data: {
    //         userId: user.id,
    //         company: "Tech Corp",
    //         role: "Software Developer",
    //         startDate: new Date("2022-07-01"),
    //         endDate: new Date("2023-12-31"),
    //         description:
    //             "Developed web applications using modern JavaScript frameworks.",
    //         translations: {
    //             create: [
    //                 { language: "en", field: "company", value: "Tech Corp" },
    //                 { language: "vi", field: "company", value: "Công ty Tech" },
    //                 { language: "en", field: "role", value: "Software Developer" },
    //                 { language: "vi", field: "role", value: "Lập trình viên phần mềm" },
    //                 {
    //                     language: "en",
    //                     field: "description",
    //                     value:
    //                         "Developed web applications using modern JavaScript frameworks.",
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: "description",
    //                     value:
    //                         "Phát triển các ứng dụng web sử dụng các framework JavaScript hiện đại.",
    //                 },
    //             ],
    //         },
    //         technologies: {
    //             create: [
    //                 { technology: { connect: { name: "React" } } },
    //                 { technology: { connect: { name: "Node.js" } } },
    //             ],
    //         },
    //     },
    // })

    // // Seed project
    // await prisma.project.create({
    //     data: {
    //         userId: user.id,
    //         title: "Portfolio Website",
    //         description: "My personal portfolio to showcase projects and skills.",
    //         githubLink: "https://github.com/lthphuw/portfolio",
    //         liveLink: "https://yourportfolio.com",
    //         startDate: new Date("2023-01-01"),
    //         endDate: new Date("2023-03-01"),
    //         translations: {
    //             create: [
    //                 { language: "en", field: "title", value: "Portfolio Website" },
    //                 { language: "vi", field: "title", value: "Trang Web Danh Mục" },
    //                 {
    //                     language: "en",
    //                     field: "description",
    //                     value: "My personal portfolio to showcase projects and skills.",
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: "description",
    //                     value:
    //                         "Danh mục cá nhân của tôi để giới thiệu các dự án và kỹ năng.",
    //                 },
    //             ],
    //         },
    //         techStacks: {
    //             create: [
    //                 { techStack: { connect: { name: "React" } } },
    //                 { techStack: { connect: { name: "Node.js" } } },
    //             ],
    //         },
    //         images: {
    //             create: [
    //                 {
    //                     url: "/images/portfolio-screenshot.jpg",
    //                     translations: {
    //                         create: [
    //                             {
    //                                 language: "en",
    //                                 field: "caption",
    //                                 value: "Portfolio screenshot",
    //                             },
    //                             {
    //                                 language: "vi",
    //                                 field: "caption",
    //                                 value: "Ảnh chụp màn hình danh mục",
    //                             },
    //                         ],
    //                     },
    //                 },
    //                 {
    //                     url: "images/portfolio-screenshot2.jpg",
    //                     translations: {
    //                         create: [
    //                             {
    //                                 language: "en",
    //                                 field: "caption",
    //                                 value: "Portfolio screenshot 2",
    //                             },
    //                             {
    //                                 language: "vi",
    //                                 field: "caption",
    //                                 value: "Ảnh chụp màn hình danh mục 2",
    //                             },
    //                         ],
    //                     },
    //                 },
    //             ],
    //         },
    //     },
    // })

    // // Seed tags
    // const tags = [
    //     { name: "coding" },
    //     { name: "web-development" },
    //     { name: "open-source" },
    // ]

    // await prisma.tag.createMany({
    //     data: tags.map((tag) => ({ name: tag.name })),
    //     skipDuplicates: true,
    // })

    // // Seed translations for tags
    // for (const tag of tags) {
    //     const tagRecord = await prisma.tag.findFirst({ where: { name: tag.name } })
    //     if (tagRecord) {
    //         await prisma.translation.createMany({
    //             data: [
    //                 {
    //                     language: "en",
    //                     field: `tag.${tag.name}.name`,
    //                     value:
    //                         tag.name === "web-development" ? "web development" : tag.name,
    //                     tagId: tagRecord.id,
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: `tag.${tag.name}.name`,
    //                     value:
    //                         tag.name === "coding"
    //                             ? "lập trình"
    //                             : tag.name === "web-development"
    //                                 ? "phát triển web"
    //                                 : "mã nguồn mở",
    //                     tagId: tagRecord.id,
    //                 },
    //             ],
    //             skipDuplicates: true,
    //         })
    //     }
    // }

    // // Seed blog
    // await prisma.blog.create({
    //     data: {
    //         userId: user.id,
    //         title: "My First Blog Post",
    //         content:
    //             "This is the content of my first blog post about my journey as a developer.",
    //         slug: "my-first-blog-post",
    //         translations: {
    //             create: [
    //                 { language: "en", field: "title", value: "My First Blog Post" },
    //                 {
    //                     language: "vi",
    //                     field: "title",
    //                     value: "Bài Blog Đầu Tiên Của Tôi",
    //                 },
    //                 {
    //                     language: "en",
    //                     field: "content",
    //                     value:
    //                         "This is the content of my first blog post about my journey as a developer.",
    //                 },
    //                 {
    //                     language: "vi",
    //                     field: "content",
    //                     value:
    //                         "Đây là nội dung bài blog đầu tiên của tôi về hành trình làm lập trình viên.",
    //                 },
    //             ],
    //         },
    //         tags: {
    //             create: [
    //                 { tag: { connect: { name: "coding" } } },
    //                 { tag: { connect: { name: "web-development" } } },
    //             ],
    //         },
    //     },
    // })

    console.log("Seeding completed!")
}

main()
    .catch((e: unknown) => {
        console.error("Error seeding database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
