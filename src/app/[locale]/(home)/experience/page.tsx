import ExperienceTimeline, { CompanyExperience } from "@/components/experience-timeline";
import { ExperienceShell } from "@/components/shell";
import { fetchData } from "@/lib/fetch";

// Next.js will invalidate the cache when a
// request comes in, at most once every 60 seconds.
export const revalidate = 86400

// We'll prerender only the params from `generateStaticParams` at build time.
// If a request comes in for a path that hasn't been generated,
// Next.js will server-render the page on-demand.
export const dynamicParams = true // or false, to 404 on unknown paths


export default async function ExperiencesPage() {
    const experiences = await fetchData<CompanyExperience[]>('me/experiences');
    return (
        <ExperienceShell>
            <ExperienceTimeline experienceData={experiences} />
        </ExperienceShell>
    );
}