'use client';

import { useState } from 'react';
import { Variants, motion } from 'framer-motion';

import { GameContent } from './game-content';
import { Icons } from './icons';

export interface HobbieItem {
  id: string;
  title: string;
  icon: React.ReactNode;
}

export interface ContentProps {
  hobbies: HobbieItem[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
  },
};

const hobbies = [
  {
    id: 'gaming',
    title: 'Gaming',
    icon: <Icons.game size={48} />,
  },
  {
    id: 'music',
    title: 'Music',
    icon: <Icons.music size={48} />,
  },
  {
    id: 'excercise',
    title: 'Excercise',
    icon: <Icons.exercise size={48} />,
  },
  {
    id: 'coding',
    title: 'Coding',
    icon: <Icons.coding size={48} />,
  },
];

export function HobbiesContent() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md mx-auto mt-12 md:mt-16 grid grid-cols-2 gap-4 md:gap-10"
      >
        {hobbies.map((hobby) => (
          <motion.div key={hobby.id} variants={itemVariants} layout>
            <div
              className="container-bg cursor-pointer px-4 py-6 w-full min-h-[97px] md:w-[216px] md:min-h-[184px] flex flex-col justify-center align-center rounded-xl gap-4 shadow-lg dark:shadow-[0_2px_12px_rgba(255,255,255,0.05)]"
              onClick={() =>
                setSelectedId(selectedId === hobby.id ? null : hobby.id)
              }
            >
              <h2 className="flex items-center justify-center text-xl font-semibold">
                {hobby.title}
              </h2>
              <div className="flex items-center justify-center">
                {hobby.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <GameContent />
    </>
  );
}
