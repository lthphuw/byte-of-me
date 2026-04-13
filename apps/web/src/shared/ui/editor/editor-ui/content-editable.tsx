import type { JSX } from 'react';

import { ContentEditable as LexicalContentEditable } from '@lexical/react/LexicalContentEditable';





type Props = {
  placeholder: string;
  className?: string;
  placeholderClassName?: string;
};

export function ContentEditable({
  placeholder,
  className,
  placeholderClassName,
}: Props): JSX.Element {
  return (
    <LexicalContentEditable
      className={
        className ??
        `ContentEditable__root relative block min-h-72 min-h-full overflow-auto px-8 py-4 focus:outline-none`
      }
      aria-placeholder={placeholder}
      placeholder={
        <div
          className={
            placeholderClassName ??
            `text-muted-foreground pointer-events-none absolute left-0 top-0 select-none overflow-hidden text-ellipsis px-8 py-[18px]`
          }
        >
          {placeholder}
        </div>
      }
    />
  );
}
