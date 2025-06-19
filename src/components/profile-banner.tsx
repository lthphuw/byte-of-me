"use client";

import { useEffect, useRef, useState } from "react";
import Stack from "./image-stack";

export interface ImagesProps {
    id: string;
    src: string;
    alt?: string;
    caption?: string;
}
export interface ProfileBannerProps {
    images: ImagesProps[];
}

export function ProfileBanner({ images }: ProfileBannerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [cardWidth, setCardWidth] = useState(720); // default fallback

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const observer = new ResizeObserver(([entry]) => {
            const fullWidth = entry.contentRect.width - 50;
            // padding: 24 * 2 = 48, nên width còn lại:
            const usableWidth = fullWidth;
            setCardWidth(Math.min(usableWidth, 720)); // không vượt quá 720
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const [selectedImage, setSelectedImage] = useState(images[images.length - 1].id);
    const [caption, setCaption] = useState(images[images.length - 1].caption);

    useEffect(() => {
        setCaption(images.find((it) => it.id === selectedImage)?.caption || images[0].caption);
    }, [selectedImage]);
    return (
        <figure ref={containerRef} className="flex w-full flex-col items-start gap-4 md:gap-6 overflow-visible">
            <div className="relative w-full">
                <Stack
                    randomRotation={true}
                    sensitivity={200}
                    sendToBackOnClick={true}
                    cardDimensions={{ width: cardWidth, height: Math.floor(cardWidth * 2 / 3) }}
                    cardsData={images}
                    setSelectedCard={setSelectedImage}
                />
            </div>

            {caption && (
                <figcaption className="text-sm italic">{caption}</figcaption>
            )}
        </figure>
    );
}
