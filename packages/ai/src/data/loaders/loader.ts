import { Education, Experience, Project, TechStack, User } from '@db/index';
import { Document } from '@langchain/core/documents';
import { convert } from 'html-to-text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { fetchData } from '@ai/infra/fetch/fetch';

const translations: { [index: string]: any } = {
  en: {
    profileHeader: '=== Phu\'s Personal Profile ===',
    fullName: 'Full Name',
    location: 'Location: Ho Chi Minh City, Vietnam',
    about: 'About Phu',
    biography: 'Phu\'s Biography',
    tagline: 'Tagline',
    dob: 'Date of Birth',
    quote: 'Phu\'s Favorite Quote',
    contact: 'Contact Information',
    links: 'Links',
    profileFooter: '=== End of Phu\'s Profile ===',
    experienceHeader: (company: string) => `=== Phu's Work Experience at ${company} ===`,
    company: 'Company',
    employmentType: 'Employment Type',
    locationField: 'Location',
    technologies: 'Technologies',
    roles: 'Roles',
    role: 'Role',
    duration: 'Duration',
    timePeriod: 'Time Period',
    responsibilities: 'Responsibilities',
    experienceFooter: (company: string) => `=== End of Phu's Work Experience at ${company} ===`,
    educationHeader: '=== Phu\'s Education ===',
    institution: 'Institution/Program',
    timePeriodEdu: 'Time Period',
    description: 'Description',
    highlights: 'Highlights',
    educationFooter: '=== End of Phu\'s Education ===',
    projectHeader: '=== Phu\'s Project ===',
    projectTitle: 'Project Title',
    projectType: 'Type: Personal/Side Project',
    projectDescription: 'Description',
    projectTechs: 'Technologies',
    projectTags: 'Tags',
    projectFooter: '=== End of Phu\'s Project ===',
    techStackHeader: '=== Phu\'s Technology Stack ===',
    techStackList: 'List of technologies used by Phu in personal and side projects',
    techStackItem: (name: string, group: string) => `• ${name} (Category: ${group})`,
    techStackFooter: '=== End of Phu\'s Technology Stack ===',
    noTechnologies: 'No technologies specified',
    noTasks: 'No tasks specified',
    noRoles: 'No roles specified',
    noHighlights: 'No highlights available',
    noDescription: 'No description',
    unknown: 'Unknown',
  },
  vi: {
    profileHeader: '=== Hồ sơ cá nhân của Phú ===',
    fullName: 'Họ và Tên',
    location: 'Địa điểm: Thành phố Hồ Chí Minh, Việt Nam',
    about: 'Về Phú',
    biography: 'Tiểu sử của Phú',
    tagline: 'Khẩu hiệu',
    dob: 'Ngày sinh',
    quote: 'Trích dẫn yêu thích của Phú',
    contact: 'Thông tin liên hệ',
    links: 'Liên kết',
    profileFooter: '=== Kết thúc hồ sơ của Phú ===',
    experienceHeader: (company: string) => `=== Kinh nghiệm làm việc của Phú tại ${company} ===`,
    company: 'Công ty',
    employmentType: 'Loại hình làm việc',
    locationField: 'Địa điểm',
    technologies: 'Công nghệ',
    roles: 'Vai trò',
    role: 'Vai trò',
    duration: 'Thời gian',
    timePeriod: 'Thời kỳ',
    responsibilities: 'Trách nhiệm',
    experienceFooter: (company: string) => `=== Kết thúc kinh nghiệm làm việc của Phú tại ${company} ===`,
    educationHeader: '=== Học vấn của Phú ===',
    institution: 'Trường học/Chương trình',
    timePeriodEdu: 'Thời gian',
    description: 'Mô tả',
    highlights: 'Điểm nổi bật',
    educationFooter: '=== Kết thúc học vấn của Phú ===',
    projectHeader: '=== Dự án của Phú ===',
    projectTitle: 'Tên dự án',
    projectType: 'Loại: Dự án cá nhân/Dự án phụ',
    projectDescription: 'Mô tả',
    projectTechs: 'Công nghệ',
    projectTags: 'Thẻ',
    projectFooter: '=== Kết thúc dự án của Phú ===',
    techStackHeader: '=== Bộ công nghệ của Phú ===',
    techStackList: 'Danh sách công nghệ được Phú sử dụng trong các dự án cá nhân và phụ',
    techStackItem: (name: string, group: string) => `• ${name} (Danh mục: ${group})`,
    techStackFooter: '=== Kết thúc bộ công nghệ của Phú ===',
    noTechnologies: 'Không có công nghệ nào được chỉ định',
    noTasks: 'Không có nhiệm vụ nào được chỉ định',
    noRoles: 'Không có vai trò nào được chỉ định',
    noHighlights: 'Không có điểm nổi bật nào',
    noDescription: 'Không có mô tả',
    unknown: 'Không xác định',
  },
  fr: {
    profileHeader: '=== Profil personnel de Phú ===',
    fullName: 'Nom complet',
    location: 'Localisation : Ho Chi Minh Ville, Vietnam',
    about: 'À propos de Phú',
    biography: 'Biographie de Phú',
    tagline: 'Slogan',
    dob: 'Date de naissance',
    quote: 'Citation préférée de Phú',
    contact: 'Informations de contact',
    links: 'Liens',
    profileFooter: '=== Fin du profil de Phú ===',
    experienceHeader: (company: string) => `=== Expérience professionnelle de Phú chez ${company} ===`,
    company: 'Entreprise',
    employmentType: 'Type d\'emploi',
    locationField: 'Localisation',
    technologies: 'Technologies',
    roles: 'Rôles',
    role: 'Rôle',
    duration: 'Durée',
    timePeriod: 'Période',
    responsibilities: 'Responsabilités',
    experienceFooter: (company: string) => `=== Fin de l'expérience professionnelle de Phú chez ${company} ===`,
    educationHeader: '=== Formation de Phú ===',
    institution: 'Établissement/Programme',
    timePeriodEdu: 'Période',
    description: 'Description',
    highlights: 'Points forts',
    educationFooter: '=== Fin de la formation de Phú ===',
    projectHeader: '=== Projet de Phú ===',
    projectTitle: 'Titre du projet',
    projectType: 'Type : Projet personnel/Projet parallèle',
    projectDescription: 'Description',
    projectTechs: 'Technologies',
    projectTags: 'Étiquettes',
    projectFooter: '=== Fin du projet de Phú ===',
    techStackHeader: '=== Pile technologique de Phú ===',
    techStackList: 'Liste des technologies utilisées par Phú dans des projets personnels et parallèles',
    techStackItem: (name: string, group: string) => `• ${name} (Catégorie : ${group})`,
    techStackFooter: '=== Fin de la pile technologique de Phú ===',
    noTechnologies: 'Aucune technologie spécifiée',
    noTasks: 'Aucune tâche spécifiée',
    noRoles: 'Aucun rôle spécifié',
    noHighlights: 'Aucun point fort disponible',
    noDescription: 'Aucune description',
    unknown: 'Inconnu',
  },
};

const convertToText = (html?: string | null): string =>
  convert(html || '', {
    wordwrap: 130,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'ul', format: 'list', options: { itemPrefix: '- ' } },
      { selector: 'li', format: 'listItem' },
    ],
  })
    .replace(/[\u2022\u2192\u2013\u2014]/g, '')
    .trim();

export async function fetchAndBuildDocuments(): Promise<Document[]> {
  const rawDocs: Document[] = [];
  const locales = ['en', 'vi', 'fr'];

  try {
    for (const locale of locales) {
      const t = translations[locale];

      // Fetch all data in parallel with error handling
      const [me, experiences, educations, techstacks, projects] =
        await Promise.all([
          fetchData<User>('me', { locale }).catch(() => null),
          fetchData<Experience[]>('me/experiences', { locale }).catch(
            () => [],
          ),
          fetchData<Education[]>('me/educations', { locale }).catch(
            () => [],
          ),
          fetchData<TechStack[]>('me/techstacks', { locale }).catch(
            () => [],
          ),
          fetchData<Project[]>('me/projects', { locale }).catch(() => []),
        ]);

      // Log fetched data for debugging
      // console.log(`Fetched Data (${locale}):`, {
      //   me: !!me ? { id: me.id, name: me.name } : null,
      //   experiences:
      //     experiences?.map((e) => ({ id: e.id, company: e.company })) ?? [],
      //   educations:
      //     educations?.map((e) => ({ id: e.id, title: e.title })) ?? [],
      //   techstacks:
      //     techstacks?.map((t) => ({ id: t.id, name: t.name })) ?? [],
      //   projects: projects?.map((p) => ({ id: p.id, title: p.title })) ?? [],
      // });

      // === Profile ===
      if (me) {
        if (!me.id) {
          console.warn(`Missing ID for user profile (${locale})`);
        }
        const content = [
          t.profileHeader,
          `${t.fullName}: ${me.name}`,
          t.location,
          convertToText(me.aboutMe) && `${t.about}:\n${convertToText(me.aboutMe)}`,
          convertToText(me.bio) && `${t.biography}:\n${convertToText(me.bio)}`,
          me.tagLine && `${t.tagline}: "${me.tagLine}"`,
          me.birthdate && `${t.dob}: ${me.birthdate}`,
          convertToText(me.quote) &&
          `${t.quote}:\n"${convertToText(me.quote)}"`,
          `${t.contact}:\n${[me.email, me.phoneNumber]
            .filter(Boolean)
            .join(' | ')}`,
          `${t.links}:\n${[me.github, me.linkedIn, me.portfolio, me.leetCode]
            .filter(Boolean)
            .join(' | ')}`,
          t.profileFooter,
        ]
          .filter(Boolean)
          .join('\n\n');

        rawDocs.push(
          new Document({
            id: `me-profile-${me.id || 'missing-user-id-' + Math.random().toString(36).slice(2)}-${locale}`,
            pageContent: content,
            metadata: {
              source: 'profile',
              type: 'personal-profile',
              document_type: 'profile',
              name: me.name,
              locale,
              keywords: [
                'Phu',
                'profile',
                locale === 'en' ? 'personal information' : locale === 'vi' ? 'thông tin cá nhân' : 'informations personnelles',
                locale === 'en' ? 'about' : locale === 'vi' ? 'về' : 'à propos',
                locale === 'en' ? 'bio' : locale === 'vi' ? 'tiểu sử' : 'biographie',
              ],
            },
          }),
        );
      }

      // === Work Experience ===
      for (const exp of experiences ?? []) {
        if (!exp.id) {
          console.warn(
            `Missing ID for experience at ${exp.company || t.unknown} (${locale})`,
          );
        }

        const techs =
          (exp as any).techStack
            ?.map((t: string) => t)
            .filter(Boolean)
            .join(', ') || t.noTechnologies;

        const roles =
          (exp as any).roles
            ?.map((r: any) => {
              const tasks =
                r.tasks
                  ?.map((t: string) => `- ${t}`)
                  .filter(Boolean)
                  .join('\n') || t.noTasks;

              if (!r.tasks || r.tasks.length === 0) {
                console.warn(
                  `No tasks found for role "${r.title}" at ${exp.company || t.unknown} (${locale})`,
                );
              }

              return [
                `${t.role}: ${r.title || t.unknown}`,
                `${t.duration}: ${r.duration || 'N/A'}`,
                `${t.timePeriod}: ${r.from} → ${r.to || (locale === 'en' ? 'Present' : locale === 'vi' ? 'Hiện tại' : 'Présent')}`,
                tasks && `${t.responsibilities}:\n${tasks}`,
              ]
                .filter(Boolean)
                .join('\n');
            })
            .filter(Boolean)
            .join('\n\n') || t.noRoles;

        if (!exp.type || exp.type === 'N/A') {
          console.warn(`Missing employment type for ${exp.company || t.unknown} (${locale})`);
        }
        if (!exp.location || exp.location === 'N/A') {
          console.warn(`Missing location for ${exp.company || t.unknown} (${locale})`);
        }

        const content = [
          t.experienceHeader(exp.company || t.unknown),
          `${t.company}: ${exp.company || t.unknown}`,
          `${t.employmentType}: ${exp.type || t.unknown}`,
          `${t.locationField}: ${exp.location || t.unknown}`,
          techs && `${t.technologies}: ${techs}`,
          roles && `${t.roles}:\n${roles}`,
          t.experienceFooter(exp.company || t.unknown),
        ]
          .filter(Boolean)
          .join('\n\n');

        rawDocs.push(
          new Document({
            id: `exp-${exp.id || 'missing-exp-id-' + Math.random().toString(36).slice(2)}-${locale}`,
            pageContent: content,
            metadata: {
              source: 'experience',
              document_type: 'work-experience',
              company: exp.company || t.unknown,
              techStack: techs.split(', ').filter(Boolean),
              name: 'Phu',
              locale,
              roleTitles: (exp as any).roles?.map((r: any) => r.title) || [],
              keywords: [
                'Phu',
                locale === 'en' ? 'work experience' : locale === 'vi' ? 'kinh nghiệm làm việc' : 'expérience professionnelle',
                locale === 'en' ? 'job' : locale === 'vi' ? 'công việc' : 'emploi',
                locale === 'en' ? 'employment' : locale === 'vi' ? 'việc làm' : 'emploi',
                locale === 'en' ? 'employee' : locale === 'vi' ? 'nhân viên' : 'employé',
                locale === 'en' ? 'work' : locale === 'vi' ? 'làm việc' : 'travail',
                exp.company || t.unknown,
                'Smart Loyalty',
                ...(exp.company === 'Smart Loyalty'
                  ? [
                    locale === 'en' ? 'Software Engineer Intern 1' : locale === 'vi' ? 'Thực tập sinh Kỹ sư Phần mềm 1' : 'Stagiaire Ingénieur Logiciel 1',
                    locale === 'en' ? 'Software Engineer Intern 2' : locale === 'vi' ? 'Thực tập sinh Kỹ sư Phần mềm 2' : 'Stagiaire Ingénieur Logiciel 2',
                  ]
                  : []),
                exp.type || t.unknown,
                exp.location || t.unknown,
                ...techs.split(', '),
                ...((exp as any).roles?.map((r: any) => r.title) || []),
                ...((exp as any).roles?.flatMap(
                  (r: any) =>
                    r.tasks
                      ?.map((t: string) =>
                        t
                          .toLowerCase()
                          .match(
                            /\b(cryptography|grpc|react|next\.js|ssr|csr|isr|redis|mongodb|component|api)\b/g,
                          ),
                      )
                      .flat()
                      .filter(Boolean) || [],
                ) || []),
              ].filter(Boolean),
            },
          }),
        );
      }

      // === Education ===
      for (const edu of educations ?? []) {
        if (!edu.id) {
          console.warn(`Missing ID for education: ${edu.title || t.unknown} (${locale})`);
        }

        const highlights =
          (edu as any).subItems
            ?.map(
              (s: any) =>
                `- ${convertToText(s.title)}: ${convertToText(s.message)}`,
            )
            .filter(Boolean)
            .join('\n') || t.noHighlights;

        const content = [
          t.educationHeader,
          `${t.institution}: ${convertToText(edu.title) || t.unknown}`,
          `${t.timePeriodEdu}: ${edu.timeline || 'N/A'}`,
          `${t.description}:\n${convertToText(edu.message) || t.noDescription}`,
          highlights && `${t.highlights}:\n${highlights}`,
          t.educationFooter,
        ]
          .filter(Boolean)
          .join('\n\n');

        rawDocs.push(
          new Document({
            id: `edu-${edu.id || 'missing-edu-id-' + Math.random().toString(36).slice(2)}-${locale}`,
            pageContent: content,
            metadata: {
              source: 'education',
              document_type: 'education',
              title: convertToText(edu.title) || t.unknown,
              name: 'Phu',
              locale,
              keywords: [
                'Phu',
                locale === 'en' ? 'education' : locale === 'vi' ? 'học vấn' : 'formation',
                locale === 'en' ? 'degree' : locale === 'vi' ? 'bằng cấp' : 'diplôme',
                locale === 'en' ? 'study' : locale === 'vi' ? 'học tập' : 'études',
                edu.title,
                edu.timeline,
              ].filter(Boolean),
            },
          }),
        );
      }

      // === Projects ===
      for (const project of projects ?? []) {
        if (!project.id) {
          console.warn(`Missing ID for project: ${project.title || t.unknown} (${locale})`);
        }

        const techs =
          (project as any).techstacks
            ?.map((t: any) => t?.name || t?.techstack?.name)
            .filter(Boolean)
            .join(', ') || t.noTechnologies;

        const tags =
          (project as any).tags
            ?.map((t: any) => t?.name || t?.tag?.name)
            .filter(Boolean)
            .join(', ') || t.noTags;

        const content = [
          t.projectHeader,
          `${t.projectTitle}: ${project.title || t.unknown}`,
          t.projectType,
          `${t.projectDescription}:\n${convertToText(project.description) || t.noDescription}`,
          techs && `${t.projectTechs}:\n${techs}`,
          tags && `${t.projectTags}:\n${tags}`,
          t.projectFooter,
        ]
          .filter(Boolean)
          .join('\n\n');

        rawDocs.push(
          new Document({
            id: `project-${project.id || 'missing-project-id-' + Math.random().toString(36).slice(2)}-${locale}`,
            pageContent: content,
            metadata: {
              source: 'project',
              document_type: 'project',
              title: project.title || t.unknown,
              name: 'Phu',
              locale,
              keywords: [
                'Phu',
                locale === 'en' ? 'project' : locale === 'vi' ? 'dự án' : 'projet',
                locale === 'en' ? 'side project' : locale === 'vi' ? 'dự án cá nhân' : 'projet parallèle',
                project.title,
                ...tags.split(', '),
                ...techs.split(', '),
              ].filter(Boolean),
            },
          }),
        );
      }

      // === Tech Stack ===
      if (techstacks && techstacks.length > 0) {
        const techstackId = `techstack-all-${locale}`;
        const content = [
          t.techStackHeader,
          t.techStackList,
          ...techstacks.map(
            (tech) => t.techStackItem(tech.name, tech.group || 'N/A'),
          ),
          t.techStackFooter,
        ].join('\n\n');

        if (techstacks.some((t) => !t.id)) {
          console.warn(
            `Missing IDs for some tech stacks (${locale}):`,
            techstacks.map((t) => ({ name: t.name, id: t.id })),
          );
        }

        rawDocs.push(
          new Document({
            id: techstackId,
            pageContent: content,
            metadata: {
              source: 'techstack',
              document_type: 'techstack',
              name: 'Phu',
              locale,
              techNames: techstacks.map((t) => t.name),
              keywords: [
                'Phu',
                locale === 'en' ? 'technology' : locale === 'vi' ? 'công nghệ' : 'technologie',
                locale === 'en' ? 'tech stack' : locale === 'vi' ? 'bộ công nghệ' : 'pile technologique',
                ...techstacks.map((t) => t.name),
                ...techstacks.map((t) => t.group).filter(Boolean),
              ],
            },
          }),
        );
      }
    }

    // === Split Documents ===
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ['\n\n', '\n', ' ', ''],
    });

    const allChunks = await splitter.splitDocuments(rawDocs);

    // Add chunk metadata and ensure unique IDs
    return allChunks.map((doc, i) => {
      const parentId =
        doc.id ||
        doc.metadata.id ||
        'missing-id-' + Math.random().toString(36).slice(2);
      return {
        ...doc,
        id: `${parentId}-chunk-${i + 1}`,
        metadata: {
          ...doc.metadata,
          chunk_number: i + 1,
          id: `${parentId}-chunk-${i + 1}`,
        },
      };
    });
  } catch (error) {
    console.error('Error building documents:', error);
    return [];
  }
}
