'use client';

import React from 'react';
import {
  Button,
  type ButtonProps,
  Input,
  Label,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@byte-of-me/ui-primitives';
import { cn, normalizeLinkInput } from '@byte-of-me/ui-utils';
import { Link2, Trash2, X } from 'lucide-react';

import { useToolbar } from './toolbar-provider';

const LinkToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const { editor, state, labels } = useToolbar();
    const [open, setOpen] = React.useState(false);
    const [link, setLink] = React.useState('');
    const inputId = React.useId();

    const currentHref = state.link.href;

    const apply = () => {
      const url = normalizeLinkInput(link);
      if (!url || !editor) return;

      const chain = editor.chain().focus();
      const { empty } = editor.state.selection;

      if (empty && editor.isActive('link')) {
        // Caret sitting inside a link with nothing selected: rewrite the whole
        // link rather than only marking the (empty) selection.
        chain.extendMarkRange('link').setLink({ href: url }).run();
      } else if (empty) {
        // Nothing selected and no link under the caret: the URL itself is the
        // only sensible link text.
        chain
          .insertContent({
            type: 'text',
            text: url,
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      } else {
        chain.setLink({ href: url }).run();
      }

      setOpen(false);
    };

    const remove = () => {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
      setLink('');
      setOpen(false);
    };

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          // Read the link under the caret when opening — the caret may have
          // moved since the last time this popover was used.
          if (next) setLink(currentHref);
          setOpen(next);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger disabled={!state.link.canSet} asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-max px-3 font-normal',
                  state.link.active && 'bg-accent',
                  className
                )}
                ref={ref}
                {...props}
              >
                <Link2 />
                <span className="underline underline-offset-4">
                  {labels.link}
                </span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <span>{labels.link}</span>
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          onCloseAutoFocus={(e) => {
            e.preventDefault();
          }}
          asChild
          className="relative px-3 py-2.5"
        >
          {/*
            Deliberately a <div>, not a <form>: this editor is mounted inside
            the blog form, and React bubbles portal events up the React tree —
            a nested form would submit the whole post on every link.
          */}
          <div className="relative">
            <PopoverClose
              className="absolute right-3 top-3"
              aria-label={labels.close}
            >
              <X className="h-4 w-4" />
            </PopoverClose>
            <div>
              <Label htmlFor={inputId}>{labels.link}</Label>
              <p className="text-muted-foreground text-sm">{labels.linkHint}</p>
              <div className="mt-3 flex flex-col items-end justify-end gap-3">
                <Input
                  id={inputId}
                  autoFocus
                  value={link}
                  onChange={(e) => {
                    setLink(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    // Enter that commits an IME composition (Vietnamese Telex
                    // among them) is not a request to apply the link.
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      apply();
                    }
                  }}
                  className="w-full"
                  placeholder="https://example.com"
                />
                <div className="flex items-center gap-3">
                  {currentHref && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8"
                      variant="ghost"
                      onClick={remove}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {labels.remove}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="h-8"
                    onClick={apply}
                  >
                    {currentHref ? labels.update : labels.confirm}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

LinkToolbar.displayName = 'LinkToolbar';

export { LinkToolbar };
