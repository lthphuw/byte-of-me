"use client"

import { Quote } from "lucide-react"

export interface ProfileQuoteProps {
    quote: string
}

export function ProfileQuote({ quote }: ProfileQuoteProps) {
    return (
        <blockquote className="flex max-w-xl items-start gap-2 text-sm italic text-muted-foreground">
            <Quote className="mt-1 size-4 shrink-0 text-muted-foreground" />
            <span>{quote}</span>
        </blockquote>
    )
}
