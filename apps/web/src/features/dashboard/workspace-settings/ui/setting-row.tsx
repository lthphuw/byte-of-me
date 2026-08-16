'use client';

import { useId } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@byte-of-me/ui';

import { cn } from '@/shared/lib/utils';

/**
 * One labelled control in the settings dialog.
 *
 * Every setting is a name, a sentence saying what it actually does, and one
 * control — so the layout is written once here rather than being re-typed nine
 * times with nine slightly different paddings. The description is not optional:
 * a settings panel where half the rows explain themselves and half do not is a
 * panel where the reader assumes the unexplained ones are obvious, and they
 * never are.
 *
 * `useId` rather than hand-written ids: two of these can appear on screen at
 * once (the dialog re-mounts per tab), and duplicate `htmlFor` targets silently
 * point the second label at the first control.
 */
interface SettingRowProps {
  label: string;
  description: string;
  children: (controlId: string) => React.ReactNode;
  /** Stacks the control under the text — for controls too wide to sit beside it. */
  stacked?: boolean;
}

export function SettingRow({
  label,
  description,
  children,
  stacked = false,
}: SettingRowProps) {
  const controlId = useId();

  return (
    <div
      className={cn(
        'flex gap-4 py-4',
        stacked ? 'flex-col' : 'flex-row items-start justify-between'
      )}
    >
      <div className="min-w-0 space-y-1">
        <Label
          htmlFor={controlId}
          className="text-sm font-medium leading-none"
        >
          {label}
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className={cn('shrink-0', stacked && 'w-full')}>
        {children(controlId)}
      </div>
    </div>
  );
}

/** A boolean setting. */
export function SettingSwitch({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      {(controlId) => (
        <Switch
          id={controlId}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      )}
    </SettingRow>
  );
}

/**
 * A setting with a small, fixed set of named values.
 *
 * `options` carries its own labels rather than the caller mapping them inline,
 * so the value written to the database and the string shown to the author stay
 * next to each other at every call site — the pair that drifts first when a new
 * option is added.
 */
export function SettingSelect<Value extends string>({
  label,
  description,
  value,
  options,
  onValueChange,
}: {
  label: string;
  description: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string }>;
  onValueChange: (value: Value) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      {(controlId) => (
        <Select
          value={value}
          onValueChange={(next) => onValueChange(next as Value)}
        >
          <SelectTrigger id={controlId} className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </SettingRow>
  );
}
