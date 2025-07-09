import { Education, Experience, Project, TechStack, User } from '@db/index';
import { Document } from '@langchain/core/documents';
import { convert } from 'html-to-text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { fetchData } from '../../infra/fetch/fetch';

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

  try {
    // Fetch all data in parallel with error handling
    const [me, experiences, educations, techstacks, projects] =
      await Promise.all([
        fetchData<User>('me', { locale: 'en' }).catch(() => null),
        fetchData<Experience[]>('me/experiences', { locale: 'en' }).catch(
          () => [],
        ),
        fetchData<Education[]>('me/educations', { locale: 'en' }).catch(
          () => [],
        ),
        fetchData<TechStack[]>('me/techstacks', { locale: 'en' }).catch(
          () => [],
        ),
        fetchData<Project[]>('me/projects', { locale: 'en' }).catch(() => []),
      ]);

    // Log fetched data for debugging
    console.log('Fetched Data:', {
      me: !!me ? { id: me.id, name: me.name } : null,
      experiences:
        experiences?.map((e) => ({ id: e.id, company: e.company })) ?? [],
      educations: educations?.map((e) => ({ id: e.id, title: e.title })) ?? [],
      techstacks: techstacks?.map((t) => ({ id: t.id, name: t.name })) ?? [],
      projects: projects?.map((p) => ({ id: p.id, title: p.title })) ?? [],
    });

    // === Profile ===
    if (me) {
      if (!me.id) {
        console.warn('Missing ID for user profile');
      }
      const content = [
        `=== Phu's Personal Profile ===`,
        `Full Name: ${me.name}`,
        `Location: Ho Chi Minh City, Vietnam`,
        convertToText(me.aboutMe) && `About Phu:\n${convertToText(me.aboutMe)}`,
        convertToText(me.bio) && `Phu's Biography:\n${convertToText(me.bio)}`,
        me.tagLine && `Tagline: "${me.tagLine}"`,
        me.birthdate && `Date of Birth: ${me.birthdate}`,
        convertToText(me.quote) &&
          `Phu's Favorite Quote:\n"${convertToText(me.quote)}"`,
        `Contact Information:\n${[me.email, me.phoneNumber]
          .filter(Boolean)
          .join(' | ')}`,
        `Links:\n${[me.github, me.linkedIn, me.portfolio, me.leetCode]
          .filter(Boolean)
          .join(' | ')}`,
        `=== End of Phu's Profile ===`,
      ]
        .filter(Boolean)
        .join('\n\n');

      rawDocs.push(
        new Document({
          id: `me-profile-${
            me.id || 'missing-user-id-' + Math.random().toString(36).slice(2)
          }`,
          pageContent: content,
          metadata: {
            source: 'profile',
            type: 'personal-profile',
            document_type: 'profile',
            name: me.name,
            keywords: [
              'Phu',
              'profile',
              'personal information',
              'about',
              'bio',
            ],
          },
        }),
      );
    }

    // === Work Experience ===
    for (const exp of experiences ?? []) {
      if (!exp.id) {
        console.warn(
          `Missing ID for experience at ${exp.company || 'Unknown'}`,
        );
      }

      const techs =
        (exp as any).techStack
          ?.map((t: string) => t)
          .filter(Boolean)
          .join(', ') || 'No technologies specified';

      const roles =
        (exp as any).roles
          ?.map((r: any) => {
            const tasks =
              r.tasks
                ?.map((t: string) => `- ${t}`)
                .filter(Boolean)
                .join('\n') || 'No tasks specified';

            if (!r.tasks || r.tasks.length === 0) {
              console.warn(
                `No tasks found for role "${r.title}" at ${
                  exp.company || 'Unknown'
                }`,
              );
            }

            return [
              `Role: ${r.title || 'Unknown'}`,
              `Duration: ${r.duration || 'N/A'}`,
              `Time Period: ${r.from} → ${r.to || 'Present'}`,
              tasks && `Responsibilities:\n${tasks}`,
            ]
              .filter(Boolean)
              .join('\n');
          })
          .filter(Boolean)
          .join('\n\n') || 'No roles specified';

      if (!exp.type || exp.type === 'N/A') {
        console.warn(`Missing employment type for ${exp.company || 'Unknown'}`);
      }
      if (!exp.location || exp.location === 'N/A') {
        console.warn(`Missing location for ${exp.company || 'Unknown'}`);
      }

      const content = [
        `=== Phu's Work Experience at ${exp.company || 'Unknown'} ===`,
        `Company: ${exp.company || 'Unknown'}`,
        `Employment Type: ${exp.type || 'Unknown'}`,
        `Location: ${exp.location || 'Unknown'}`,
        techs && `Technologies: ${techs}`,
        roles && `Roles:\n${roles}`,
        `=== End of Phu's Work Experience at ${exp.company || 'Unknown'} ===`,
      ]
        .filter(Boolean)
        .join('\n\n');

      rawDocs.push(
        new Document({
          id: `exp-${
            exp.id || 'missing-exp-id-' + Math.random().toString(36).slice(2)
          }`,
          pageContent: content,
          metadata: {
            source: 'experience',
            document_type: 'work-experience',
            company: exp.company || 'Unknown',
            techStack: techs.split(', ').filter(Boolean),
            name: 'Phu',
            roleTitles: (exp as any).roles?.map((r: any) => r.title) || [],
            keywords: [
              'Phu',
              'work experience',
              'job',
              'employment',
              'employee',
              exp.company || 'Unknown',
              'Smart Loyalty',
              ...(exp.company === 'Smart Loyalty'
                ? ['Software Engineer Intern 1', 'Software Engineer Intern 2']
                : []),
              exp.type || 'Unknown',
              exp.location || 'Unknown',
              ...techs.split(', '),
              ...((exp as any).roles?.map((r: any) => r.title) || []),
              // Extract task-specific keywords
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
        console.warn(`Missing ID for education: ${edu.title || 'Unknown'}`);
      }

      const highlights =
        (edu as any).subItems
          ?.map(
            (s: any) =>
              `- ${convertToText(s.title)}: ${convertToText(s.message)}`,
          )
          .filter(Boolean)
          .join('\n') || 'No highlights available';

      const content = [
        `=== Phu's Education ===`,
        `Institution/Program: ${convertToText(edu.title) || 'Unknown'}`,
        `Time Period: ${edu.timeline || 'N/A'}`,
        `Description:\n${convertToText(edu.message) || 'No description'}`,
        highlights && `Highlights:\n${highlights}`,
        `=== End of Phu's Education ===`,
      ]
        .filter(Boolean)
        .join('\n\n');

      rawDocs.push(
        new Document({
          id: `edu-${
            edu.id || 'missing-edu-id-' + Math.random().toString(36).slice(2)
          }`,
          pageContent: content,
          metadata: {
            source: 'education',
            document_type: 'education',
            title: convertToText(edu.title) || 'Unknown',
            name: 'Phu',
            keywords: [
              'Phu',
              'education',
              'degree',
              'study',
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
        console.warn(`Missing ID for project: ${project.title || 'Unknown'}`);
      }

      const techs =
        (project as any).techstacks
          ?.map((t: any) => t?.name || t?.techstack?.name)
          .filter(Boolean)
          .join(', ') || 'No technologies specified';

      const tags =
        (project as any).tags
          ?.map((t: any) => t?.name || t?.tag?.name)
          .filter(Boolean)
          .join(', ') || 'No tags specified';

      const content = [
        `=== Phu's Project ===`,
        `Project Title: ${project.title || 'Untitled'}`,
        `Type: Personal/Side Project`,
        `Description:\n${
          convertToText(project.description) || 'No description'
        }`,
        techs && `Technologies:\n${techs}`,
        tags && `Tags:\n${tags}`,
        `=== End of Phu's Project ===`,
      ]
        .filter(Boolean)
        .join('\n\n');

      rawDocs.push(
        new Document({
          id: `project-${
            project.id ||
            'missing-project-id-' + Math.random().toString(36).slice(2)
          }`,
          pageContent: content,
          metadata: {
            source: 'project',
            document_type: 'project',
            title: project.title || 'Untitled',
            name: 'Phu',
            keywords: [
              'Phu',
              'project',
              'side project',
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
      const techstackId = 'techstack-all'; // Explicitly set ID
      const content = [
        `=== Phu's Technology Stack ===`,
        `List of technologies used by Phu in personal and side projects:`,
        ...techstacks.map(
          (tech) => `• ${tech.name} (Category: ${tech.group || 'N/A'})`,
        ),
        `=== End of Phu's Technology Stack ===`,
      ].join('\n\n');

      if (techstacks.some((t) => !t.id)) {
        console.warn(
          'Missing IDs for some tech stacks:',
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
            techNames: techstacks.map((t) => t.name),
            keywords: [
              'Phu',
              'technology',
              'tech stack',
              ...techstacks.map((t) => t.name),
              ...techstacks.map((t) => t.group).filter(Boolean),
            ],
          },
        }),
      );
    }

    // === Split Documents ===
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 800,
      chunkOverlap: 150,
      separators: ['\n\n', '\n', ' ', ''],
    });

    const allChunks = await splitter.splitDocuments(rawDocs);

    // console.log('All Chunks: ', allChunks);
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
