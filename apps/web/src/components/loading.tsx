'use client';

import { cn } from '@/lib/utils';
import { motion, useAnimate, type AnimationSequence, type Transition } from 'framer-motion';
import { useEffect } from 'react';

export type LoadingProps = {
    className?: string
}

export default function Loading({ className }: LoadingProps) {
    const [scope, animate] = useAnimate();

    useEffect(() => {
        const animateLoader = async () => {
            const sequence: AnimationSequence = [
                ['.p', { pathLength: 1, pathOffset: 0 }, { duration: 0.8, ease: 'linear' } as Transition],
                ['.p', { pathLength: 0, pathOffset: 1 }, { duration: 0.4, ease: 'linear' } as Transition],
                ['.h', { pathLength: 1, pathOffset: 0 }, { duration: 0.8, ease: 'linear' } as Transition],
                ['.h', { pathLength: 0, pathOffset: 1 }, { duration: 0.4, ease: 'linear' } as Transition],
                ['.u', { pathLength: 1, pathOffset: 0 }, { duration: 0.8, ease: 'linear' } as Transition],
                ['.u', { pathLength: 0, pathOffset: 1 }, { duration: 0.4, ease: 'linear' } as Transition],
            ];

            const runAnimation = async () => {
                await animate(sequence);
                runAnimation(); // Recursively repeat the sequence
            };

            runAnimation();
        };

        animateLoader();
    }, [animate]);

    return (
        <motion.svg
            ref={scope}
            className={cn("block mx-auto w-[80px] h-[30px]", className)}
            viewBox="0 0 80 30"
            style={{ overflow: 'visible' }}
            aria-label="Loading animation"
        >
            {/* P */}
            <motion.path
                className="p stroke-gray-700 dark:stroke-gray-200"
                initial={{ pathLength: 0, pathOffset: 0 }}
                d="M 5 25 V 5 H 15 Q 20 5 20 10 Q 20 15 15 15 H 10 V 25 Z"
                style={{
                    fill: 'none',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                }}
            />
            {/* H */}
            <motion.path
                className="h stroke-gray-700 dark:stroke-gray-200"
                initial={{ pathLength: 0, pathOffset: 0 }}
                d="M 30 25 V 5 H 35 V 15 H 45 V 5 H 50 V 25 H 45 V 15 H 35 V 25 Z"
                style={{
                    fill: 'none',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                }}
            />
            {/* U */}
            <motion.path
                className="u stroke-gray-700 dark:stroke-gray-200"
                initial={{ pathLength: 0, pathOffset: 0 }}
                d="M 55 5 H 60 V 20 Q 60 25 65 25 Q 70 25 70 20 V 5 H 75 V 20 Q 75 28 65 28 Q 55 28 55 20 Z"
                style={{
                    fill: 'none',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                }}
            />
        </motion.svg>
    );
}