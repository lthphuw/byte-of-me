'use client';

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import GradientText from "./gradient-text";

export interface ChatButtonProps {
    className?: string;
    style?: React.CSSProperties;
}
export function ChatButton({ className, style }: ChatButtonProps) {
    return (
        <Link href={'/ask-me'}>
            <GradientText
                className={cn(className)}
            >
                Ask me anything
            </GradientText>
        </Link>
    )
}