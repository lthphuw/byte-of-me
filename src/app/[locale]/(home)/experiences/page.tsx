import ExperienceTimeline, { CompanyExperience } from "@/components/experience-timeline";
import { ExperiencesShell } from "@/components/shell";

const experienceData: CompanyExperience[] = [
    {
        company: "Novo",
        logoUrl: "/images/about/image1.jpeg",
        roles: [
            {
                title: "Senior Backend Engineer",
                from: "Aug 2023",
                to: "Present",
                duration: "3 m",
                location: "Bangalore Urban, India",
                type: "Full-Time",
                isHighlighted: true,
                tasks: [
                    "Designed and deployed scalable backend APIs.",
                    "Optimized database queries for performance.",
                    "Led a team of 3 developers.",
                ],
            },
        ],
    },
    {
        company: "Postman",
        logoUrl: "/images/about/image2.jpeg",
        roles: [
            {
                title: "Software Engineer II",
                from: "May 2021",
                to: "Aug 2023",
                duration: "2 yr, 3 m",
                location: "Bengaluru, India",
                type: "Full-Time",
                isHighlighted: true,
                tasks: [
                    "Developed RESTful services for API platform.",
                    "Improved testing framework coverage.",
                    "Collaborated with frontend team on integrations.",
                ],
            },
            {
                title: "Software Engineer",
                from: "Jul 2019",
                to: "Apr 2021",
                duration: "1 yr, 9 m",
                location: "Bengaluru, India",
                type: "Full-Time",
                tasks: [
                    "Built core features for API testing tools.",
                    "Debugged and resolved production issues.",
                    "Contributed to open-source projects.",
                ],
            },
            {
                title: "Software Engineering Intern",
                from: "Dec 2018",
                to: "Jun 2019",
                duration: "6 m",
                location: "Bengaluru, India",
                type: "Full-Time",
                tasks: [
                    "Assisted in developing internal tools.",
                    "Participated in code reviews.",
                    "Supported bug fixing and documentation.",
                ],
            },
        ],
    },
];

export default function Page() {
    return (
        <ExperiencesShell>
            <ExperienceTimeline
                experienceData={experienceData}
            />
        </ExperiencesShell>
    );
}