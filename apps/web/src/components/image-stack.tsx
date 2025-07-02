'use client';

import { motion, useMotionValue, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useIsMobile } from '@/hooks/use-is-mobile';
import { Skeleton } from './ui/skeleton';

interface CardRotateProps {
  children: React.ReactNode;
  onSendToBack: () => void;
  sensitivity: number;
}

function CardRotate({ children, onSendToBack, sensitivity }: CardRotateProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [60, -60]);
  const rotateY = useTransform(x, [-100, 100], [-60, 60]);

  function handleDragEnd(_: never, info: { offset: { x: number; y: number } }) {
    if (
      Math.abs(info.offset.x) > sensitivity ||
      Math.abs(info.offset.y) > sensitivity
    ) {
      onSendToBack();
    } else {
      x.set(0);
      y.set(0);
    }
  }

  return (
    <motion.div
      className="absolute cursor-grab"
      style={{ x, y, rotateX, rotateY }}
      drag
      dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
      dragElastic={0.6}
      whileTap={{ cursor: 'grabbing' }}
      onDragEnd={handleDragEnd}
    >
      {children}
    </motion.div>
  );
}

interface ImageStackProps {
  randomRotation?: boolean;
  sensitivity?: number;
  cardDimensions?: { width: number; height: number };
  sendToBackOnClick?: boolean;
  cardsData?: { id: string; src: string, alt?: string }[];
  animationConfig?: { stiffness: number; damping: number };
  setSelectedCard?: (id: string) => void;
}

export default function ImageStack({
  randomRotation = false,
  sensitivity = 200,
  cardDimensions = { width: 208, height: 208 },
  cardsData = [],
  animationConfig = { stiffness: 260, damping: 20 },
  sendToBackOnClick = false,
  setSelectedCard,
}: ImageStackProps) {
  const isMobile = useIsMobile();
  const [cards, setCards] = useState(cardsData);
  const randomRotateList = useMemo<number[]>(
    () => cardsData.map(() => Math.random() * 10 - 5),
    []
  );

  const sendToBack = useCallback((id: string) => {
    setCards((prev) => {
      const newCards = [...prev];
      const index = newCards.findIndex((card) => card.id === id);
      const [card] = newCards.splice(index, 1);

      newCards.unshift(card);
      return newCards;
    });
  }, []);

  useEffect(() => {
    if (setSelectedCard && cards.length > 0) {
      setSelectedCard(cards[cards.length - 1].id);
    }
  }, [cards]);

  return (
    <div
      className="relative -ml-4 md:-ml-8"
      style={{
        width: cardDimensions.width,
        height: cardDimensions.height,
        perspective: 600,
      }}
    >
      {cards.map((card, index) => {
        const randomRotate = randomRotation ? randomRotateList[index] : 0;
        const [isLoaded, setIsLoaded] = useState(false);

        return (
          <CardRotate
            key={card.id}
            onSendToBack={() => sendToBack(card.id)}
            sensitivity={sensitivity}
          >
            <motion.div
              className="relative rounded-2xl overflow-hidden border-4 border-slate-600 dark:border-slate-300  bg-muted"
              onClick={() => sendToBackOnClick && sendToBack(card.id)}
              animate={{
                rotateZ: (cards.length - index - 1) * 4 + randomRotate,
                scale: 1 + index * 0.06 - cards.length * 0.06,
                transformOrigin: '90% 90%',
              }}
              initial={true}
              transition={{
                type: 'spring',
                stiffness: animationConfig.stiffness,
                damping: animationConfig.damping,
              }}
              style={{
                width: cardDimensions.width,
                height: cardDimensions.height,
              }}
            >
              {!isLoaded && (
                <Skeleton className="absolute inset-0 w-full h-full z-0" />
              )}

              <Image
                src={card.src}
                alt={card.alt ?? `card-${card.id}`}
                className="w-full h-full object-cover pointer-events-none z-10"
                onLoad={() => setIsLoaded(true)}
                quality={isMobile ? 75 : 100}
                fill
              />
            </motion.div>
          </CardRotate>
        );
      })}
    </div>
  );
}
