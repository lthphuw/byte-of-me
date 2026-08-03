import { Extension, InputRule } from '@tiptap/core';

export interface LinkSuggestionOptions {
  /**
   * Fired when the author types the trigger, after it has been removed from
   * the document. The consumer opens whatever picker it likes and calls back
   * with a link — or with nothing, if the author changes their mind.
   */
  onTrigger?: () => void;
}

/**
 * Opens a link picker when `[[` is typed.
 *
 * An input rule, not `@tiptap/suggestion`: that package is not in the
 * workspace catalog and AGENTS §11.1 rules out adding one. The rule is also
 * enough on its own here, because the picker this feeds is a centred command
 * dialog rather than a caret-anchored popover — there is no position to track
 * and no keyboard to forward, which is the part `suggestion` actually earns
 * its keep for. A dialog is also the better surface on a phone, where a
 * popover anchored to the caret ends up under the on-screen keyboard.
 *
 * The trigger characters are deleted as they are recognised, so an author who
 * dismisses the picker is left with a clean document rather than a stray
 * `[[` to tidy up.
 */
export const LinkSuggestion = Extension.create<LinkSuggestionOptions>({
  name: 'linkSuggestion',

  addOptions() {
    return { onTrigger: undefined };
  },

  addInputRules() {
    return [
      new InputRule({
        // Anchored to the end: the rule runs against the text just before the
        // cursor, so this fires on the second `[` and nowhere else.
        find: /\[\[$/,
        handler: ({ range, chain }) => {
          const onTrigger = this.options.onTrigger;
          if (!onTrigger) return;

          chain().deleteRange(range).run();
          onTrigger();
        },
      }),
    ];
  },
});
