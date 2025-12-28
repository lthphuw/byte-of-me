'use client';

import { useCallback, useState } from 'react';
import {
  FloatingPortal,
  useClick,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { AnimatePresence, motion } from 'framer-motion';

import { embeddingModels, llmModels, rerankerModels } from '@/config/models';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useLockBody } from '@/hooks/use-lock-body';
import { useTranslations } from '@/hooks/use-translations';
import { Button } from '@/components/ui/button';
import { FilterSelect } from '@/components/filter-select';
import { Icons } from '@/components/icons';





export interface ModelSelectorProps {
  llm: string;
  setLLM: (llm: string) => void;
  embedding: string;
  setEmbedding: (embedding: string) => void;
  reranker: string;
  setReranker: (reranker: string) => void;
}

export function ModelSelector({
  llm,
  setLLM,
  embedding,
  setEmbedding,
  reranker,
  setReranker,
}: ModelSelectorProps) {
  const t = useTranslations('chat.model');
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();
  const { refs, context } = useFloating({
    open,
    onOpenChange: setOpen,
  });

  const onClose = useCallback(() => setOpen(false), []);

  const click = useClick(context);
  const role = useRole(context);
  const { getReferenceProps } = useInteractions([click, role]);

  // Lock scroll when opening model
  useLockBody(open);

  return (
    <div className="relative inline-block">
      <Button
        ref={refs.setReference}
        {...getReferenceProps()}
        variant={'link'}
        className="flex items-center gap-2 -ml-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          animate={{ rotate: hovered || open ? 90 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 2 }}
        >
          <Icons.component />
        </motion.div>
        {!isMobile && <span>Models</span>}
      </Button>

      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                onClick={(e) => {
                  e.stopPropagation();
                }}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-72 md:max-w-2xl flex flex-col gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-6 shadow-lg"
              >
                <h3 className={'font-semibold'}>Choose models</h3>

                <FilterSelect
                  items={llmModels.map((it) => ({
                    ...it,
                    desc: t(`desc.${it.id.replace('.', '')}` as never),
                  }))}
                  selectedId={llm}
                  onSelect={setLLM}
                  useAllOption={false}
                  renderInBody={false}
                  equalWidth={true}
                />

                <FilterSelect
                  items={embeddingModels.map((it) => ({
                    ...it,
                    desc: t(`desc.${it.id.replace('.', '')}` as never),
                  }))}
                  selectedId={embedding}
                  onSelect={setEmbedding}
                  useAllOption={false}
                  renderInBody={false}
                  equalWidth={true}
                />

                <FilterSelect
                  items={rerankerModels.map((it) => ({
                    ...it,
                    desc: t(`desc.${it.id.replace('.', '')}` as never),
                  }))}
                  selectedId={reranker}
                  onSelect={setReranker}
                  useAllOption={false}
                  renderInBody={false}
                  equalWidth={true}
                />

                <Button
                  variant={'ghost'}
                  size={'icon'}
                  onClick={onClose}
                  className={'absolute top-[16px] right-[16px]'}
                >
                  <Icons.close />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </div>
  );
}
