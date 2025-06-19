import AboutContent from '@/components/about';
import { AboutShell } from '@/components/shell';
import { TechGroup } from '@/components/tech-stack';
import { TimelineItemProps } from '@/components/timeline';
import { host } from '@/config/config';
import { Education, TechStack, User } from '@/generated/prisma/client';
import DOMPurify from 'isomorphic-dompurify';
import { getLocale, getTranslations } from 'next-intl/server';
import Image from "next/image";

export const revalidate = 86400;

async function getData(locale: string): Promise<Education[]> {
    const res = await fetch(`${host}/api/me?locale=${locale}`);

    if (!res.ok) {
        throw new Error('Failed to fetch user');
    }

    const educations: Education[] = await res.json();
    return educations;
}

export default async function AboutPage() {
    const t = await getTranslations('about');
    const locale = await getLocale();
    let error: string | null = null;
    // Fetch user data from API
    const userRes = await fetch(`${host}/api/me?locale=${locale}`);
    const user: User = await userRes.json();

    const educationRes = await fetch(`${host}/api/me/educations?locale=${locale}`);
    const educations: Education[] = await educationRes.json();


    const techstackRes = await fetch(`${host}/api/me/techstacks?locale=${locale}`);
    const techstacks: TechStack[] = await techstackRes.json();

    const techGroups: TechGroup[] = [];

    for (let i = 0; i < techstacks.length; i++) {
        let it = techGroups.find(it => it.title === techstacks[i].group);
        if (!it) {
            it = {
                title: techstacks[i].group,
                items: []
            }
            techGroups.push(it);
        }
        it.items.push({
            name: techstacks[i].name,
            logo: techstacks[i].logo || "",
        })
    }
    console.log("techGroups: ", techGroups);
    const educationItems: TimelineItemProps[] = educations.map((edu: any) => ({
        timeline: edu?.timeline,
        title: edu?.title,
        message: DOMPurify.sanitize(edu?.message || ""),
        icon: edu.icon ? (
            <Image
                src={edu.icon}
                alt={""}
                width={32}
                height={32}
            />
        ) : undefined,
        username: '',
        subItems: edu.subItems.map((sub: any) => ({
            title: sub.title,
            message: DOMPurify.sanitize(sub.message),
        })),
    }));

    const tocItems = [
        { href: '#aboutme', label: t('section.About me') },
        { href: '#education', label: t('section.Education') },
        { href: '#skills', label: t('section.Skills / Tech Stack') },
    ];

    return (
        <AboutShell>
            <AboutContent
                error={error}
                user={user}
                techGroups={techGroups}
                educationItems={educationItems}
                tocItems={tocItems}
                sectionTitles={{
                    aboutMe: t('section.About me'),
                    education: t('section.Education'),
                    skills: t('section.Skills / Tech Stack'),
                }}
            />
        </AboutShell>
    );
}
