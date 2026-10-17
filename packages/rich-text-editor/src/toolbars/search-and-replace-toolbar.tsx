'use client';

import { useId } from 'react';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@byte-of-me/ui-primitives';
import { ArrowLeftIcon, ArrowRightIcon, Repeat, X } from 'lucide-react';

import { useToolbar } from './toolbar-provider';
import { useSearchAndReplace } from './use-search-and-replace';

export function SearchAndReplaceToolbar() {
  const { editor, labels } = useToolbar();
  const bar = useSearchAndReplace(editor);
  const matchCaseId = useId();
  const searchId = useId();
  const replaceId = useId();

  const counter = (
    <span aria-live="polite" className="text-xs tabular-nums">
      {bar.position}/{bar.resultCount}
    </span>
  );

  return (
    <Popover open={bar.open}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={bar.toggle}
              className="h-8 w-max px-3 font-normal"
            >
              <Repeat />
              <span>{labels.searchAndReplace}</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>{labels.searchAndReplace}</span>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="end"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={bar.close}
        className="relative flex w-[400px] max-w-[calc(100vw-1rem)] px-3 py-2.5"
      >
        {!bar.replacing ? (
          <div className="relative flex w-full items-center gap-1.5">
            <Input
              value={bar.searchText}
              className="min-w-0 flex-1"
              aria-label={labels.search}
              onChange={(event) => bar.changeSearch(event.target.value)}
              placeholder={labels.searchPlaceholder}
            />
            {counter}
            <Button
              onClick={bar.previous}
              size="icon"
              variant="ghost"
              aria-label={labels.previousMatch}
            >
              <ArrowLeftIcon />
            </Button>
            <Button
              onClick={bar.next}
              size="icon"
              variant="ghost"
              aria-label={labels.nextMatch}
            >
              <ArrowRightIcon />
            </Button>
            <Separator orientation="vertical" className="mx-0.5 h-7" />
            <Button
              onClick={() => bar.setReplacing(true)}
              size="icon"
              variant="ghost"
              aria-label={labels.openReplace}
            >
              <Repeat />
            </Button>
            <Button
              onClick={bar.close}
              size="icon"
              variant="ghost"
              aria-label={labels.closeSearch}
            >
              <X />
            </Button>
          </div>
        ) : (
          <div className="relative w-full">
            <Button
              onClick={bar.close}
              size="icon"
              variant="ghost"
              aria-label={labels.closeSearch}
              className="absolute right-0 top-0"
            >
              <X />
            </Button>
            <div className="flex w-full items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                aria-label={labels.backToSearch}
                onClick={() => bar.setReplacing(false)}
              >
                <ArrowLeftIcon />
              </Button>
              <h2 className="text-sm font-medium">
                {labels.searchAndReplaceTitle}
              </h2>
            </div>

            <div className="my-2 w-full">
              <div className="mb-3 space-y-2">
                <Label
                  htmlFor={searchId}
                  className="text-xs text-muted-foreground"
                >
                  {labels.search}
                </Label>
                <Input
                  id={searchId}
                  value={bar.searchText}
                  onChange={(event) => bar.changeSearch(event.target.value)}
                  placeholder={labels.searchPlaceholder}
                />
                {counter}
              </div>
              <div className="mb-2 space-y-2">
                <Label
                  htmlFor={replaceId}
                  className="text-xs text-muted-foreground"
                >
                  {labels.replaceWith}
                </Label>
                <Input
                  id={replaceId}
                  className="w-full"
                  value={bar.replaceText}
                  onChange={(event) => bar.changeReplace(event.target.value)}
                  placeholder={labels.replacePlaceholder}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Checkbox
                  id={matchCaseId}
                  checked={bar.matchCase}
                  onCheckedChange={(checked) =>
                    bar.changeMatchCase(checked === true)
                  }
                />
                <Label htmlFor={matchCaseId} className="text-sm">
                  {labels.matchCase}
                </Label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={bar.previous}
                  size="icon"
                  variant="secondary"
                  aria-label={labels.previousMatch}
                >
                  <ArrowLeftIcon />
                </Button>
                <Button
                  onClick={bar.next}
                  size="icon"
                  variant="secondary"
                  aria-label={labels.nextMatch}
                >
                  <ArrowRightIcon />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={bar.replaceAll}>
                  {labels.replaceAll}
                </Button>
                <Button size="sm" onClick={bar.replace}>
                  {labels.replace}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
