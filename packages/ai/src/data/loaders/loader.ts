import { Education, Experience, Project, TechStack, User } from '@db/index';
import { Document } from '@langchain/core/documents';
import { convert } from 'html-to-text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { fetchData } from '../../infra/fetch/fetch';

const convertToText = (html?: string | null): string =>
  convert(html || '', {
    wordwrap: 130,
    selectors: [{ selector: 'a', options: { ignoreHref: true } }],
  })
    .replace(/[\u2022\u2192\u2013\u2014]/g, '')
    .trim();

export async function fetchAndBuildDocuments(): Promise<Document[]> {
  const [me, experiences, educations, techstacks, projects] = await Promise.all(
    [
      fetchData<User>('me', { locale: 'en' }),
      fetchData<Experience[]>('me/experiences', { locale: 'en' }),
      fetchData<Education[]>('me/educations', { locale: 'en' }),
      fetchData<TechStack[]>('me/techstacks', { locale: 'en' }),
      fetchData<Project[]>('me/projects', { locale: 'en' }),
    ],
  );

  const rawDocs: Document[] = [];

  // === Profile ===
  if (me) {
    const content = [
      `This is the personal profile of ${me.name}.`,
      `He is based in Ho Chi Minh City, Vietnam.`,
      convertToText(me.aboutMe) && `About: ${convertToText(me.aboutMe)}`,
      convertToText(me.bio) && `Biography: ${convertToText(me.bio)}`,
      me.tagLine && `Tagline: ${me.tagLine}`,
      me.birthdate && `Date of Birth: ${me.birthdate}`,
      convertToText(me.quote) && `Quote: "${convertToText(me.quote)}"`,
      `Contact Information: ${[me.email, me.phoneNumber]
        .filter(Boolean)
        .join(', ')}`,
      `Links: ${[me.github, me.linkedIn, me.portfolio, me.leetCode]
        .filter(Boolean)
        .join(' | ')}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    rawDocs.push(
      new Document({
        id: `me-profile-${me.id}`,
        pageContent: content,
        metadata: {
          source: 'me',
          type: 'profile',
          document_type: 'profile',
        },
      }),
    );
  }

  // === Experience ===
  for (const exp of experiences ?? []) {
    const roles = (exp as any).roles
      ?.map((r: any) => {
        const tasks = r.tasks
          ?.map((t: any) => `Task: ${convertToText(t.content)}`)
          .join('\n');
        return [
          `Role: ${r.title}`,
          `From: ${r.startDate}, To: ${r.endDate || 'Present'}`,
          tasks,
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n\n');

    const content = [
      `Work experience at ${exp.company}.`,
      `Type: ${exp.type}.`,
      `Location: ${exp.location}.`,
      roles,
    ]
      .filter(Boolean)
      .join('\n\n');

    rawDocs.push(
      new Document({
        id: `exp-${exp.id}`,
        pageContent: content,
        metadata: {
          source: 'experience',
          company: exp.company,
          document_type: 'experience',
        },
      }),
    );
  }

  // === Education ===
  for (const edu of educations ?? []) {
    const highlights = (edu as any).subItems
      ?.map(
        (s: any) => `${convertToText(s.title)}: ${convertToText(s.message)}`,
      )
      .join('\n');

    const content = [
      `Education background: ${convertToText(edu.title)}.`,
      `Time period: ${edu.timeline}`,
      `Description: ${convertToText(edu.message)}`,
      highlights && `Highlights:\n${highlights}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    rawDocs.push(
      new Document({
        id: `edu-${edu.id}`,
        pageContent: content,
        metadata: {
          source: 'education',
          title: convertToText(edu.title),
          document_type: 'education',
        },
      }),
    );
  }

  // === Projects ===
  for (const project of projects ?? []) {
    const techs = (project as any).techstacks
      ?.map((t: any) => t?.name || t?.techstack?.name)
      .filter(Boolean)
      .join(', ');

    const tags = (project as any).tags
      ?.map((t: any) => t?.name || t?.tag?.name)
      .filter(Boolean)
      .join(', ');

    const content = [
      `Project Title: ${project.title}`,
      `Description: ${convertToText(project.description)}`,
      techs && `Technologies used: ${techs}`,
      tags && `Topics related: ${tags}`,
    ]
      .filter(Boolean)
      .join('\n\n');

    rawDocs.push(
      new Document({
        id: `project-${project.id}`,
        pageContent: content,
        metadata: {
          source: 'project',
          title: project.title,
          document_type: 'project',
        },
      }),
    );
  }

  // === TechStack grouped ===
  if (techstacks && techstacks.length > 0) {
    const content = techstacks
      .map((tech) => `Technology: ${tech.name}, Category: ${tech.group}`)
      .join('\n');

    rawDocs.push(
      new Document({
        id: `techstack-all`,
        pageContent: `This document lists all the technologies used in Phu's projects:\n\n${content}`,
        metadata: {
          source: 'techstack',
          document_type: 'techstack_grouped',
        },
      }),
    );
  }

  // === Split ===
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 100,
  });

  const allChunks = await splitter.splitDocuments(rawDocs);

  return allChunks.map((doc, i) => {
    doc.metadata.chunk_number = i + 1;
    return doc;
  });
}
