'use client';

import { useClipboard } from '@mantine/hooks';
import { Check, Copy } from 'lucide-react';

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
    <div className="relative my-6 group">
      <div className="absolute right-3 top-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <span className="text-xs font-mono text-neutral-400 uppercase">
          {lang}
        </span>
        <button
          onClick={() => copy(code)}
          className="p-1.5 bg-neutral-800 rounded-md hover:bg-neutral-700"
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
