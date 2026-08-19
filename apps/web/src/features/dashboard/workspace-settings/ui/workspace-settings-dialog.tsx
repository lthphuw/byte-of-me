'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Button,
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
import { useHasRunningBatchJob } from '@/features/dashboard/workspace-settings/lib/use-batch-job';
import { MaintenancePanel } from '@/features/dashboard/workspace-settings/ui/maintenance-panel';
import {
  SettingSelect,
  SettingSwitch,
} from '@/features/dashboard/workspace-settings/ui/setting-row';
import { cn } from '@/shared/lib/utils';

/**
 * What every tab panel shares: no top margin (the viewport supplies the
 * spacing) and a short fade-and-rise on arrival.
 *
 * Radix unmounts the panel that is leaving, so the one arriving is always a
 * fresh node and the enter animation runs on every switch without any state of
 * its own. It moves by a quarter of a rem — enough to read as "this is new
 * content", not so much that it competes with the height tween underneath it.
 *
 * Maintenance is the exception: it is `forceMount`ed (see below), so it is
 * never a fresh node and animates only once, when the dialog opens.
 */
const PANEL = 'mt-0 duration-200 animate-in fade-in-0 slide-in-from-bottom-1';

/**
 * Measures the visible panel and reports its natural height.
 *
 * A `ResizeObserver` rather than a measurement per tab change, because the
 * height moves for reasons other than switching tabs: a maintenance job grows
 * a progress bar while it runs, and the Vietnamese descriptions wrap to a
 * different number of lines than the English ones. Anything that changes the
 * panel's size should move the frame with it.
 *
 * `offsetHeight` rather than the entry's `contentRect`: the measured element
 * carries the panel's own padding, and `contentRect` reports the content box,
 * which would leave the viewport exactly one `pb-6` too short and permanently
 * scrollable by 24px.
 */
function usePanelHeight() {
  const [panelHeight, setPanelHeight] = useState<number>();
  const observerRef = useRef<ResizeObserver | null>(null);

  // A CALLBACK ref, not `useRef` plus an effect, and the difference is the
  // whole feature. `Dialog` renders its content through a portal only while
  // it is open, but this component — and therefore any mount effect in it —
  // runs from the moment the workspace loads, when the panel does not exist
  // and `ref.current` is still null. An effect keyed on `[]` would look once,
  // find nothing, and never be given a second chance; the panels then sized
  // themselves and the tween never ran at all. React calls a callback ref
  // when the node actually arrives.
  const panelRef = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!element) {
      // Back to `auto` on close, so reopening measures the tab it is actually
      // showing rather than tweening down from whatever was open last time.
      setPanelHeight(undefined);
      return;
    }

    // Safe against a feedback loop, which is the usual hazard here: the height
    // this produces is applied to the element's PARENT, and a block child of a
    // fixed-height block parent still takes its own content height.
    const observer = new ResizeObserver(() => {
      setPanelHeight(element.offsetHeight);
    });
    observer.observe(element);
    observerRef.current = observer;
  }, []);

  return { panelRef, panelHeight };
}

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
 *
 * ## The tab strip does not move
 *
 * The four panels are quite different heights — one control in Links, four in
 * Editing, three job cards in Maintenance. `DialogContent` centres itself
 * vertically, so a taller panel used to push the title and the tab strip
 * UPWARDS by half the difference: the row you just clicked slid out from under
 * the pointer, and the next click landed somewhere else. Switching tabs must
 * change what is below the strip and nothing above it.
 *
 * So the top edge is pinned (`top-[8dvh] translate-y-0`, replacing the
 * `top-1/2 -translate-y-1/2` centring) and the panel viewport grows downwards
 * into the space under it. Height is transitioned rather than snapped, which is
 * what makes the growth read as the panel resizing rather than the dialog
 * being replaced.
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
  const { panelRef, panelHeight } = usePanelHeight();

  /**
   * Closing the dialog unmounts the maintenance panel, and unmounting cancels
   * a running job — so the first close attempt during one is answered with a
   * warning instead of a close, and only the second goes through.
   *
   * A banner rather than a confirmation dialog: a modal on top of a modal
   * means two focus traps arguing over Escape, which is the key most people
   * are pressing when they arrive here.
   */
  const hasRunningJob = useHasRunningBatchJob();
  const [closeWarned, setCloseWarned] = useState(false);

  /**
   * The flag is dropped the moment the job it was raised for ends.
   *
   * Without this it survives its own warning. The banner used to be drawn on
   * `hasRunningJob && closeWarned` while the close guard consumed
   * `closeWarned` alone, so a job finishing between the first Escape and the
   * next paint took the banner off screen and left the flag armed. What that
   * cost is not the frame nobody saw: it is the NEXT job. Start another one,
   * press Escape, and the guard reads "already warned" and closes the dialog —
   * killing a job whose warning was never shown at all. `useBatchJob`'s own
   * `mountedRef` is hardened against the same shape of staleness, a flag
   * outliving the run it describes.
   *
   * Adjusted during render rather than from an effect, which is what collapses
   * the two facts into one: React re-runs this component before committing, so
   * there is no frame in which the banner is absent while the guard is still
   * armed — the state that hides the banner is the state that disarms the
   * guard. An effect would leave exactly one such frame, and one keystroke is
   * all that frame needs to be worth. (Converges in a single pass: the
   * assignment can only ever run when `closeWarned` is true.)
   */
  if (closeWarned && !hasRunningJob) setCloseWarned(false);

  const requestOpenChange = (next: boolean) => {
    if (!next && hasRunningJob && !closeWarned) {
      setCloseWarned(true);
      return;
    }
    setCloseWarned(false);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      {/* `top-[8dvh] translate-y-0` overrides the centring — see the note on
          the tab strip above. The dialog then hangs from a fixed line near the
          top of the viewport, so nothing above the panels can move. */}
      <DialogContent className="top-[8dvh] max-h-[85dvh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* `pr-12`, not `px-6`: `DialogContent` positions its own close button
            absolutely in the top-right corner, so a header row that runs to the
            full width puts the save indicator underneath it. */}
        <DialogHeader className="space-y-1 border-b py-4 pl-6 pr-12">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{t('title')}</DialogTitle>
            <SaveIndicator isSaving={isSaving} saveError={saveError} />
          </div>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        {/* `closeWarned` alone, and that is the point rather than a
            tidy-up: it used to be `hasRunningJob && closeWarned` here against
            `closeWarned` alone in the guard, which is exactly how the two
            could disagree. The reset above makes the flag mean "warned about
            the job running RIGHT NOW", so one condition serves both. */}
        {closeWarned && (
          <div
            role="alert"
            className="flex flex-col gap-2 border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs leading-relaxed">{t('closeWhileRunning')}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => {
                setCloseWarned(false);
                onOpenChange(false);
              }}
            >
              {t('closeAnyway')}
            </Button>
          </div>
        )}

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

          {/* Two elements, not one: the OUTER is the viewport, and it is the
              one carrying the animated height, while the INNER is measured at
              its natural size. Setting a height on the element being measured
              would feed its own output back into itself.

              Deliberately NOT `flex-1`, which is what it wanted to be and what
              silently broke this: `flex-1` is `flex: 1 1 0%`, and a flex basis
              of zero replaces `height` as the main size. The inline height was
              applied, correct, and completely ignored — the panels sized
              themselves from content and nothing ever tweened.

              `max-h` rather than clamping the inline value, so the ceiling
              holds on the very first frame too, before anything is measured. It
              is what is left of the dialog once the header and the tab strip
              have taken theirs; past that a tall panel scrolls. */}
          <div
            className="max-h-[calc(85dvh_-_9rem)] overflow-y-auto transition-[height] duration-300 ease-out motion-reduce:transition-none"
            style={
              panelHeight === undefined ? undefined : { height: panelHeight }
            }
          >
            <div ref={panelRef} className="px-6 pb-6">
              <TabsContent value="appearance" className={cn(PANEL, 'divide-y')}>
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

              <TabsContent value="editing" className={cn(PANEL, 'divide-y')}>
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

              <TabsContent value="links" className={cn(PANEL, 'divide-y')}>
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
                flick of the wheel below a font-size control.

                `forceMount` is not a rendering preference. Radix unmounts the
                panel that leaves, and `useBatchJob`'s unmount cleanup sets
                `cancelledRef` — so glancing at another tab while a whole-vault
                job ran stopped it dead, discarded the progress, and said
                nothing. The panel now stays mounted and Radix only hides it;
                the cost is that this one tab's enter animation runs once per
                dialog open instead of per switch.

                `data-[state=inactive]:hidden` is REQUIRED with it, not
                decoration: Radix writes `hidden={!present}`, and `forceMount`
                makes `present` true unconditionally — so without this rule the
                maintenance panel renders on top of every other tab. */}
              <TabsContent
                value="maintenance"
                forceMount
                className={cn(PANEL, 'data-[state=inactive]:hidden')}
              >
                <MaintenancePanel />
              </TabsContent>
            </div>
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
