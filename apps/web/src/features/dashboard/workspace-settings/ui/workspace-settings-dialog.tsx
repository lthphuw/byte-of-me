'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  AUTOSAVE_SPEEDS,
  EDITOR_DENSITIES,
  EDITOR_TYPE_SCALES,
  RENAME_LINK_POLICIES,
  useWorkspaceSettings,
} from '@/entities/workspace-settings';
import { MaintenancePanel } from '@/features/dashboard/workspace-settings/ui/maintenance-panel';
import {
  SettingSelect,
  SettingSwitch,
} from '@/features/dashboard/workspace-settings/ui/setting-row';

/**
 * Everything the workspace remembers about how the author likes to work.
 *
 * A dialog rather than a `/space/settings` route, chosen deliberately: three of
 * these settings are layout — density, type scale, line length — and the only
 * honest way to pick one is to see it applied to your own writing. A route
 * would navigate away from the note and show the choice against nothing.
 *
 * Grouped into tabs rather than one long scroll because the groups answer
 * different questions ("how should it look" vs "how should it behave" vs "what
 * should a rename do"), and because the maintenance jobs are destructive-ish
 * enough that they should not sit one flick of the wheel away from a font-size
 * control.
 *
 * There is no loading state, and that is by design rather than by omission:
 * settings are read on the server in `space/layout.tsx` and seeded into the
 * provider, so by the time this dialog can be opened they are already in
 * memory. What it does need is a SAVING state, because every change is written
 * in the background — see the indicator in the header.
 */
export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('dashboard.space.settings');
  const { settings, update, isSaving, saveError } = useWorkspaceSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{t('title')}</DialogTitle>
            <SaveIndicator isSaving={isSaving} saveError={saveError} />
          </div>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="appearance" className="flex min-h-0 flex-col">
          {/* An explicit grid rather than the default inline row: the Vietnamese
              labels are noticeably longer than the English ones, and an inline
              row reflowed to two lines at `sm` width in one locale and not the
              other. Equal columns behave the same in both. */}
          <TabsList className="mx-6 mt-4 grid shrink-0 grid-cols-4">
            <TabsTrigger value="appearance">
              {t('groups.appearance')}
            </TabsTrigger>
            <TabsTrigger value="editing">{t('groups.editing')}</TabsTrigger>
            <TabsTrigger value="links">{t('groups.links')}</TabsTrigger>
            <TabsTrigger value="maintenance">
              {t('groups.maintenance')}
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <TabsContent value="appearance" className="mt-0 divide-y">
              <SettingSelect
                label={t('appearance.density.label')}
                description={t('appearance.density.description')}
                value={settings.density}
                options={EDITOR_DENSITIES.map((value) => ({
                  value,
                  label: t(`appearance.density.options.${value}`),
                }))}
                onValueChange={(density) => update({ density })}
              />

              <SettingSelect
                label={t('appearance.typeScale.label')}
                description={t('appearance.typeScale.description')}
                value={settings.typeScale}
                options={EDITOR_TYPE_SCALES.map((value) => ({
                  value,
                  label: t(`appearance.typeScale.options.${value}`),
                }))}
                onValueChange={(typeScale) => update({ typeScale })}
              />

              <SettingSwitch
                label={t('appearance.readableLineLength.label')}
                description={t('appearance.readableLineLength.description')}
                checked={settings.readableLineLength}
                onCheckedChange={(readableLineLength) =>
                  update({ readableLineLength })
                }
              />
            </TabsContent>

            <TabsContent value="editing" className="mt-0 divide-y">
              <SettingSelect
                label={t('editing.autosaveSpeed.label')}
                description={t('editing.autosaveSpeed.description')}
                value={settings.autosaveSpeed}
                options={AUTOSAVE_SPEEDS.map((value) => ({
                  value,
                  label: t(`editing.autosaveSpeed.options.${value}`),
                }))}
                onValueChange={(autosaveSpeed) => update({ autosaveSpeed })}
              />

              <SettingSwitch
                label={t('editing.spellCheck.label')}
                description={t('editing.spellCheck.description')}
                checked={settings.spellCheck}
                onCheckedChange={(spellCheck) => update({ spellCheck })}
              />

              <SettingSwitch
                label={t('editing.formatOnExit.label')}
                description={t('editing.formatOnExit.description')}
                checked={settings.formatMarkdownOnExit}
                onCheckedChange={(formatMarkdownOnExit) =>
                  update({ formatMarkdownOnExit })
                }
              />

              <SettingSwitch
                label={t('editing.formatOnPaste.label')}
                description={t('editing.formatOnPaste.description')}
                checked={settings.formatMarkdownOnPaste}
                onCheckedChange={(formatMarkdownOnPaste) =>
                  update({ formatMarkdownOnPaste })
                }
              />
            </TabsContent>

            <TabsContent value="links" className="mt-0 divide-y">
              <SettingSelect
                label={t('links.updateOnRename.label')}
                description={t('links.updateOnRename.description')}
                value={settings.updateLinksOnRename}
                options={RENAME_LINK_POLICIES.map((value) => ({
                  value,
                  label: t(`links.updateOnRename.options.${value}`),
                }))}
                onValueChange={(updateLinksOnRename) =>
                  update({ updateLinksOnRename })
                }
              />

              {/* Stated in the panel rather than left for the author to
                  discover: the reason this setting is only about LABELS is
                  that a note link's href carries the note's id, so renaming
                  can never break navigation. Without that sentence the whole
                  setting reads as though links might break. */}
              <p className="py-4 text-xs leading-relaxed text-muted-foreground">
                {t('links.updateOnRename.note')}
              </p>
            </TabsContent>

            {/* Its own tab rather than a section at the foot of another: these
                rewrite rows across the whole vault, and they should not sit one
                flick of the wheel below a font-size control. */}
            <TabsContent value="maintenance" className="mt-0">
              <MaintenancePanel />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Saving / saved / failed, in the dialog header.
 *
 * Every control here writes in the background and none of them blocks, which
 * is what makes this indicator necessary rather than decorative: with no
 * feedback at all, a flipped switch and a flipped-switch-that-failed-and-
 * flipped-back look identical if you glanced away.
 *
 * `aria-live="polite"` for the same reason the editor's save status has it —
 * the state changes without anyone focusing it.
 */
function SaveIndicator({
  isSaving,
  saveError,
}: {
  isSaving: boolean;
  saveError: boolean;
}) {
  const t = useTranslations('dashboard.space.settings');

  if (saveError) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-destructive"
        aria-live="polite"
      >
        <TriangleAlert className="size-3.5" />
        {t('saveError')}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
      aria-live="polite"
    >
      {isSaving ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {t('saving')}
        </>
      ) : (
        <>
          <Check className="size-3.5" />
          {t('saved')}
        </>
      )}
    </span>
  );
}
