'use client';

import { useEffect, useState } from 'react';
import {
  IMAGE_COMPRESSION_FORMATS,
  type ImageCompressionConfig,
  type ImageCompressionFormat,
} from '@byte-of-me/contracts';
import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@byte-of-me/ui';
import { Check, Loader2, Settings2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CompressionSettingsPopoverProps {
  config: ImageCompressionConfig;
  update: (patch: Partial<ImageCompressionConfig>) => void;
  isSaving: boolean;
  saveError: boolean;
}

/**
 * Popover for the four compression knobs (rarely tuned; the author wants the library back at once).
 * Presentational: `MediaManager` owns `useCompressionSettings` because `ImageUpload` needs the same
 * config.
 */
export function CompressionSettingsPopover({
  config,
  update,
  isSaving,
  saveError,
}: CompressionSettingsPopoverProps) {
  const t = useTranslations('dashboard.media.compression');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          {t('trigger')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">{t('title')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <SaveStatus
            isSaving={isSaving}
            saveError={saveError}
            labels={{
              saving: t('saving'),
              saved: t('saved'),
              saveError: t('saveError'),
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* The label row is the touch target; the switch alone is 24px. */}
          <Label
            htmlFor="compression-enabled"
            className="flex flex-1 items-center text-sm"
          >
            {t('enabled.label')}
          </Label>
          <Switch
            id="compression-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => update({ enabled })}
          />
        </div>

        <NumberField
          id="compression-max-width"
          label={t('maxWidth.label')}
          value={config.maxWidth}
          min={128}
          max={8192}
          disabled={!config.enabled}
          onCommit={(maxWidth) => update({ maxWidth })}
        />

        <NumberField
          id="compression-quality"
          label={t('quality.label')}
          value={config.quality}
          min={1}
          max={100}
          disabled={!config.enabled}
          onCommit={(quality) => update({ quality })}
        />

        <div className="space-y-1">
          <Label htmlFor="compression-format" className="text-sm">
            {t('format.label')}
          </Label>
          <Select
            value={config.format}
            disabled={!config.enabled}
            onValueChange={(format) =>
              update({ format: format as ImageCompressionFormat })
            }
          >
            <SelectTrigger id="compression-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_COMPRESSION_FORMATS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`format.options.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SaveStatus({
  isSaving,
  saveError,
  labels,
}: {
  isSaving: boolean;
  saveError: boolean;
  labels: { saving: string; saved: string; saveError: string };
}) {
  if (saveError) {
    return (
      <span
        className="flex shrink-0 items-center gap-1 text-xs text-destructive-text"
        aria-live="polite"
      >
        <TriangleAlert className="size-3.5" />
        {labels.saveError}
      </span>
    );
  }

  return (
    <span
      className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
      aria-live="polite"
    >
      {isSaving ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {labels.saving}
        </>
      ) : (
        <>
          <Check className="size-3.5" />
          {labels.saved}
        </>
      )}
    </span>
  );
}

/**
 * A number input that commits on blur or Enter, not per keystroke (typing "2048" would
 * send four patches). Out-of-range input is clamped to the nearest valid value.
 */
function NumberField({
  id,
  label,
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = Number(draft);
    const clamped = Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, Math.round(parsed)))
      : value;
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}
