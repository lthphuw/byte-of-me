"use client";

import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Icons } from "./icons";

export interface ChatTitleProps {
    invoke: (message: string) => void;
    className?: string;
}

export function ChatTitle({ invoke, className }: ChatTitleProps) {
    const t = useTranslations("chat");

    const isMobile = useIsMobile();

    const examplePrompts = [
        "What technologies does Phu use for backend development?",
        "Tell me about one of Phu's personal projects.",
        "What is Phu's experience with AI?",
    ];

    return (
        <section
            className={cn(
                "w-full flex flex-col items-center gap-4 text-center",
                className
            )}
        >
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-3">
                <Icons.logo size={isMobile ? 32 : 48} />
                <h1 className="text-xl md:text-2xl font-semibold">
                    {t("Ask Phu's Assistant")}
                </h1>
            </div>

            <div className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1">
                <ul className="flex flex-col flex-wrap justify-center gap-1.5 md:gap-3 text-sm">
                    {examplePrompts.map((q, i) => (
                        <li
                            key={i}
                            className="container-bg cursor-pointer px-3 py-1 md:px-4 md:py-2 rounded-md shadow-md dark:shadow-[0_2px_4px_rgba(255,255,255,0.04)] hover:opacity-95 hover:scale-105 ease-out duration-300"
                            onClick={() => invoke(q)}
                        >
                            {q}
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
