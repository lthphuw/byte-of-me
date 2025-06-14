"use client";

import { motion } from "framer-motion";
import AvatarWithFallback from "./ui/avatar-with-fallback";

interface Role {
    title: string;
    from: string;
    to: string;
    duration: string;
    location: string;
    type: string;
    isHighlighted?: boolean;
    tasks: string[]; // Array of short task descriptions
}

export interface CompanyExperience {
    company: string;
    logoUrl: string;
    roles: Role[];
}

interface ExperienceTimelineProps {
    experienceData: CompanyExperience[];
    className?: string; // Optional className for customization
    style?: React.CSSProperties; // Optional inline styles
}

export default function ExperienceTimeline({
    experienceData,
    className,
    style,
}: ExperienceTimelineProps) {
    return (
        <section className={`mx-auto max-w-3xl px-4 py-10 ${className}`} style={style}>
            <h2 className="mb-10 text-3xl font-bold">Experience</h2>
            <div className="space-y-10">
                {experienceData.map((company, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                            ease: "easeOut",
                            duration: 0.4,
                            delay: idx * 0.3,
                        }}
                    >
                        <div className="flex items-start">
                            <div className="mr-4">
                                <AvatarWithFallback
                                    src={company.logoUrl}
                                    alt={company.company}
                                    fallbackSrc="/images/experiences/placeholder.png"
                                    fallbackText="?"
                                    size={32}
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold">{company.company}</h3>
                                <div className="mt-2 space-y-4">
                                    {company.roles.map((role, rIdx) => (
                                        <div key={rIdx} className={`pl-3 ${role.isHighlighted ? "border-l-2" : "border-l"}`}>
                                            <p className="font-medium">
                                                {role.title}{" "}
                                                {role.isHighlighted && <span>✔</span>}
                                            </p>
                                            <p className="text-sm">
                                                {role.from} – {role.to} ({role.duration}) • {role.location} • {role.type}
                                            </p>
                                            <ul className="mt-1 list-disc pl-5 text-sm">
                                                {role.tasks.map((task, tIdx) => (
                                                    <li key={tIdx}>{task}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}