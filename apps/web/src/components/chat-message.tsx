'use client';

import { defaultSpring, iconSwicthVariants } from '@/config/anim';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';
import { Icons } from './icons';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';

export interface ChatMessageProps {
    role: 'user' | 'assistant';
    content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
    const t = useTranslations('chat');
    const { copy, copied } = useClipboard({ timeout: 2000 });
    const isUser = role === 'user';
    const onCopy = useCallback(() => copy(content), [content]);
    return (
        <div
            className={cn(
                'relative group w-fit max-w-full',
                isUser ? 'ml-auto self-end' : 'self-start'
            )}
        >
            {/* Message bubble */}
            <section
                className={cn(
                    'px-3 py-2 w-fit rounded-md text-sm',
                    isUser
                        ? 'bg-neutral-200 dark:bg-neutral-dark shadow-md rounded-tl-3xl rounded-tr-3xl rounded-bl-3xl rounded-br-lg'
                        : 'bg-transparent'
                )}
            >
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw as Pluggable, rehypeSlug]}
                    components={{
                        ul: ({ children }) => <ul className="list-disc pl-6 mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-6 mb-2">{children}</ol>,
                        li: ({ children }) => <li className="leading-tight mb-2">{children}</li>,
                    }}
                >
                    {content}
                </ReactMarkdown>
            </section>

            {/* Action bar */}
            <div
                className={cn(
                    'h-8 mt-1 flex items-center gap-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto',
                    isUser ? 'justify-end' : 'justify-start'
                )}
            >
                <TooltipProvider delayDuration={300}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className='relative size-4'>
                                <AnimatePresence initial={false}>
                                    {copied ? (
                                        <motion.button
                                            key="sun"
                                            variants={iconSwicthVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            transition={defaultSpring}
                                            className='absolute inset-0'
                                        >
                                            <Icons.check size={16} />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="moon"
                                            variants={iconSwicthVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            transition={defaultSpring}
                                            onClick={onCopy}
                                            className='absolute inset-0'
                                        >
                                            <Icons.copy size={16} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>

                        </TooltipTrigger>
                        <TooltipContent sideOffset={4} side="bottom">
                            <p>{t('Copy')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
}
