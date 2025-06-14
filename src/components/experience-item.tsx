"use client";

import { motion } from "framer-motion";

export interface ExperienceItemProps {
    company: string;
    position: string;
    duration: string;
    location?: string;
    description: string[];
}

export default function ExperienceItem({
    company,
    position,
    duration,
    location,
    description,
}: ExperienceItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-8"
        >
            <h3 className="text-xl font-semibold">{position}</h3>
            <p className="text-sm text-gray-500">
                {company} • {location} • {duration}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">
                {description.map((point, index) => (
                    <li key={index}>{point}</li>
                ))}
            </ul>
        </motion.div>
    );
}
