"use client";

import { FloatingToc } from "@/components/floating-toc";
import { AboutShell } from "@/components/shell";
import { TechGroup, TechStack } from "@/components/tech-stack";
import { Timeline, TimelineItemProps } from "@/components/timeline";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function AboutPage() {
    const t = useTranslations("about");

    const aboutMe = t("aboutMe");

    const educationItems: TimelineItemProps[] = [
        {
            timeline: "2020 - 2024",
            title: t("education.bachelorTitle"),
            message: t("education.bachelorMessage"),
            icon: (
                <Image
                    src="/images/about/education/hcmus.png"
                    alt={t("education.bachelorLogoAlt")}
                    width={40}
                    height={40}
                    className="rounded-none object-contain"
                />
            ),
            username: "",
            subItems: [
                {
                    title: t("education.academicPerformanceTitle"),
                    message: t("education.academicPerformanceMessage"),
                },
                {
                    title: t("education.publishedPaperTitle"),
                    message: (
                        <div className="flex flex-col gap-2 text-sm leading-relaxed">
                            <span>
                                {t("education.publishedPaperMessagePart1")}{" "}
                                <Link
                                    href="https://cv4dc.github.io/2024/"
                                    className="text-blue-600 hover:underline"
                                >
                                    {t("education.publishedPaperLinkText")}
                                </Link>
                                :{" "}
                                <em>{t("education.publishedPaperTitleText")}</em>{" "}
                                <strong>({t("education.publishedPaperOral")})</strong>.{" "}
                                <Link
                                    href="https://cv4dc.github.io/files/2024/papers/16.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                >
                                    {t("education.publishedPaperViewLink")}
                                </Link>
                            </span>
                            <span>{t("education.publishedPaperAuthors")}</span>
                        </div>
                    ),
                },
                {
                    title: t("education.thesisScoreTitle"),
                    message: t("education.thesisScoreMessage"),
                },
                {
                    title: t("education.researchAwardTitle"),
                    message: t("education.researchAwardMessage"),
                },
                {
                    title: t("education.entranceExamTitle"),
                    message: t("education.entranceExamMessage"),
                },
                {
                    title: t("education.aiChallengeTitle"),
                    message: t("education.aiChallengeMessage"),
                },
            ],
        },
        {
            timeline: "2018 - 2020",
            title: t("education.highSchoolTitle"),
            message: t("education.highSchoolMessage"),
            icon: (
                <Image
                    src="/images/about/education/pct.png"
                    alt={t("education.highSchoolLogoAlt")}
                    width={40}
                    height={40}
                    className="rounded-none object-contain"
                />
            ),
            username: "",
            subItems: [],
        },
    ];

    const techGroups: TechGroup[] = [
        {
            title: t("techStack.frameworksTitle"),
            items: [
                { name: t("techStack.gin"), logo: "/images/about/techstacks/gin.png" },
                { name: t("techStack.grpc"), logo: "/images/about/techstacks/grpc.png" },
                { name: t("techStack.nodejs"), logo: "/images/about/techstacks/nodejs.png" },
                { name: t("techStack.fastapi"), logo: "/images/about/techstacks/fastapi.png" },
                { name: t("techStack.nextjs"), logo: "/images/about/techstacks/next.png" },
            ],
        },
        {
            title: t("techStack.librariesTitle"),
            items: [
                { name: t("techStack.reactjs"), logo: "/images/about/techstacks/react.png" },
                { name: t("techStack.framerMotion"), logo: "/images/about/techstacks/framer-motion.png" },
                { name: t("techStack.floatingUi"), logo: "/images/about/techstacks/floating-ui.png" },
            ],
        },
        {
            title: t("techStack.programmingLanguagesTitle"),
            items: [
                { name: t("techStack.go"), logo: "/images/about/techstacks/go.png" },
                { name: t("techStack.python"), logo: "/images/about/techstacks/python.png" },
                { name: t("techStack.typescript"), logo: "/images/about/techstacks/typescript.png" },
                { name: t("techStack.javascript"), logo: "/images/about/techstacks/javascript.png" },
            ],
        },
        {
            title: t("techStack.databaseTitle"),
            items: [
                { name: t("techStack.mongodb"), logo: "/images/about/techstacks/Mongodb.png" },
                { name: t("techStack.postgresql"), logo: "/images/about/techstacks/postgresql.png" },
                { name: t("techStack.cache"), logo: "/images/about/techstacks/redis.png" },
            ],
        },
    ];

    return (
        <AboutShell>
            <div className="relative flex justify-center px-4 lg:px-8 py-12">
                {/* Main Content */}
                <div className="max-w-4xl w-full space-y-12">
                    {/* Who I Am */}
                    <motion.section
                        id="aboutme"
                        variants={fadeInUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        <h2 className="text-xl md:text-3xl font-bold mb-4">{t("section.About me")}</h2>
                        <p className="text-sm md:text-md leading-relaxed whitespace-pre-line">{aboutMe}</p>
                    </motion.section>

                    {/* Education */}
                    <motion.section
                        id="education"
                        variants={fadeInUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        <Timeline title={t("section.Education")} items={educationItems} />
                    </motion.section>

                    {/* Skills */}
                    <motion.section
                        id="skills"
                        variants={fadeInUp}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                    >
                        <h2 className="text-xl md:text-3xl font-bold mb-4">{t("section.Skills / Tech Stack")}</h2>
                        <TechStack groups={techGroups} />
                    </motion.section>
                </div>
            </div>

            <FloatingToc
                items={[
                    { href: "#aboutme", label: t("section.About me") },
                    { href: "#education", label: t("section.Education") },
                    { href: "#skills", label: t("section.Skills / Tech Stack") },
                ]}
            />
        </AboutShell>
    );
}