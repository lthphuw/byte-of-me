"use client";

import Image from "next/image";
import { useState } from "react";
import { Skeleton } from "./ui/skeleton";

interface ProfileBannerProps {
    src: string;
    alt: string;
    caption?: string;
}

export function ProfileBanner({ src, alt, caption }: ProfileBannerProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <figure className="flex w-full flex-col items-center gap-3 overflow-hidden">
            <div className="relative w-full">
                {isLoading && (
                    <Skeleton className="absolute inset-0 z-10 size-full rounded-xl" />
                )}
                <Image
                    src={src}
                    alt={alt}
                    width={1200}
                    height={800}
                    sizes="100vw"
                    className={`w-full rounded-xl border object-cover shadow-md transition-opacity duration-500 ${isLoading ? "opacity-0" : "opacity-100"
                        }`}
                    priority
                    quality={100}
                    onLoadingComplete={() => setIsLoading(false)}
                />
            </div>

            {caption && (
                <figcaption className="mt-2 text-sm italic">{caption}</figcaption>
            )}
        </figure>
    );
}
