'use client';

import { Check, Copy } from 'lucide-react';

import { useClipboard } from '@/shared/hooks';





export function CodeBlock({
  code,
  lang,
  highlighted,
}: {
  code: string;
  lang: string;
  highlighted: string;
}) {
  const { copy, copied } = useClipboard({ timeout: 2000 });

  return (
    <div className="group relative my-6">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="font-mono text-xs uppercase text-neutral-400">
          {lang}
        </span>
        <button
          onClick={() => copy(code)}
          className="rounded-md bg-neutral-800 p-1.5 hover:bg-neutral-700"
        >
          {copied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-neutral-400" />
          )}
        </button>
      </div>

      <div
        className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 [&_pre]:!bg-transparent [&_pre]:!p-5"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}
