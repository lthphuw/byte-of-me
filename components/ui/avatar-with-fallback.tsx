"use client"

import Image from "next/image";
import { useState } from "react";
import { Avatar, AvatarFallback } from "./avatar";
interface AvatarWithFallbackProps {
    src: string
    alt: string
    fallbackSrc?: string
    fallbackText?: string
    className?: string
    size?: number
}

export default function AvatarWithFallback({
    src,
    alt,
    fallbackSrc = "/images/experiences/placeholder.png",
    fallbackText,
    className,
    size = 40,
}: AvatarWithFallbackProps) {
    const [imgSrc, setImgSrc] = useState(src)
    const [error, setError] = useState(false)

    return (
        <Avatar style={{ width: size, height: size }}>
            {!error ? (
                <Image
                    src={imgSrc}
                    alt={alt}
                    width={size}
                    height={size}
                    className={`aspect-square size-full object-cover ${className ?? ""}`}
                    onError={() => {
                        if (imgSrc !== fallbackSrc) {
                            setImgSrc(fallbackSrc)
                        } else {
                            setError(true)
                        }
                    }}
                />
            ) : (
                <AvatarFallback>
                    {fallbackText ?? alt.charAt(0).toUpperCase()}
                </AvatarFallback>
            )}
        </Avatar>
    )
}
