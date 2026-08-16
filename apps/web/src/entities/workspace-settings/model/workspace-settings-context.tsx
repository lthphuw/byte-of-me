'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { updateWorkspaceSettings } from '@/entities/workspace-settings/api/update-workspace-settings';
import {
  WORKSPACE_SETTINGS_DEFAULTS,
  type WorkspaceSettings,
  type WorkspaceSettingsPatch,
} from '@/entities/workspace-settings/model/settings-schema';

/**
 * The author's settings, live, for anything inside the workspace.
 *
 * Lives in `entities` rather than alongside the settings dialog on purpose.
 * Two different features read it — the dialog that writes it, and the editor
 * that obeys it — and a feature importing a sibling feature is the sideways
 * import AGENTS §4 rules out. The dialog and the editor both import an entity
 * instead, which is the direction the layering allows.
 *
 * Seeded from the server (`space/layout.tsx` → `getWorkspaceSettings`), never
 * fetched after mount. Three of these settings are layout — density, type
 * scale, line length — so a client fetch would paint the workspace once at the
 * defaults and then jump.
 */
interface WorkspaceSettingsContextValue {
  settings: WorkspaceSettings;
  /**
   * Applies a patch immediately and sends it in the background.
   *
   * Returns nothing and is not awaitable, deliberately: no control in the
   * dialog should sit disabled waiting for a round trip. A failed write is
   * reverted and surfaced through `saveError`, not through a thrown promise
   * nobody was going to catch.
   */
  update: (patch: WorkspaceSettingsPatch) => void;
  /** A write is in flight. Drives the dialog's saving indicator. */
  isSaving: boolean;
  /** The last write failed and its fields were rolled back. */
  saveError: boolean;
}

const WorkspaceSettingsContext =
  createContext<WorkspaceSettingsContextValue | null>(null);

export function WorkspaceSettingsProvider({
  initial,
  children,
}: {
  initial: WorkspaceSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<WorkspaceSettings>(initial);
  const [inFlight, setInFlight] = useState(0);
  const [saveError, setSaveError] = useState(false);

  /**
   * The last value the SERVER confirmed, which is what a failed write rolls
   * back to. Not the same as `settings`, which is optimistic — rolling back to
   * the optimistic value would be rolling back to the thing that just failed.
   */
  const confirmed = useRef<WorkspaceSettings>(initial);

  /**
   * How many writes are outstanding, readable synchronously.
   *
   * `inFlight` state drives rendering; this ref answers a different question at
   * a moment when state cannot be trusted: whether a response that has just
   * arrived is the LATEST one. Toggling a control twice quickly puts two writes
   * in the air, and adopting the first response would overwrite the second
   * patch with a value the server had not seen yet.
   */
  const pending = useRef(0);

  const update = useCallback((patch: WorkspaceSettingsPatch) => {
    setSettings((current) => ({ ...current, ...patch }));
    setSaveError(false);
    pending.current += 1;
    setInFlight((count) => count + 1);

    void (async () => {
      try {
        const result = await updateWorkspaceSettings(patch);

        if (result.success) {
          confirmed.current = result.data;
          // Only the last response in a burst is allowed to overwrite what is
          // on screen; see `pending` above. An earlier one still updates
          // `confirmed`, because it IS what the server holds — it is only
          // stale with respect to patches sent after it.
          if (pending.current === 1) setSettings(result.data);
        } else {
          // Roll back only the fields this patch touched. A concurrent patch
          // to a DIFFERENT field succeeded and must survive; restoring the
          // whole confirmed object would undo it.
          setSettings((current) => {
            const reverted = { ...current };
            for (const key of Object.keys(patch)) {
              (reverted as Record<string, unknown>)[key] =
                confirmed.current[key as keyof WorkspaceSettings];
            }
            return reverted;
          });
          setSaveError(true);
        }
      } catch {
        // A rejected action (offline, session gone) is the same outcome as a
        // refused one as far as the author is concerned: the control they just
        // moved has to move back.
        setSettings((current) => {
          const reverted = { ...current };
          for (const key of Object.keys(patch)) {
            (reverted as Record<string, unknown>)[key] =
              confirmed.current[key as keyof WorkspaceSettings];
          }
          return reverted;
        });
        setSaveError(true);
      } finally {
        pending.current -= 1;
        setInFlight((count) => count - 1);
      }
    })();
  }, []);

  const value = useMemo<WorkspaceSettingsContextValue>(
    () => ({ settings, update, isSaving: inFlight > 0, saveError }),
    [settings, update, inFlight, saveError]
  );

  return (
    <WorkspaceSettingsContext.Provider value={value}>
      {children}
    </WorkspaceSettingsContext.Provider>
  );
}

/**
 * Settings for the surrounding workspace.
 *
 * Falls back to the defaults outside a provider rather than throwing. Every
 * consumer of this is a rendering decision — how much air a paragraph gets, how
 * long to wait before saving — and none of them is worth crashing a route over.
 * It also keeps the editor mountable in a unit test without a provider, which
 * is how most of its specs render it.
 */
export function useWorkspaceSettings(): WorkspaceSettingsContextValue {
  const context = useContext(WorkspaceSettingsContext);
  if (context) return context;

  return {
    settings: WORKSPACE_SETTINGS_DEFAULTS,
    update: () => {},
    isSaving: false,
    saveError: false,
  };
}
