export const NODE_HANDLES_SELECTED_STYLE_CLASSNAME =
  'node-handles-selected-style';

/** An http or https address with no space in it: what an image URL has to be. */
export function isValidUrl(url: string) {
  return /^https?:\/\/\S+$/.test(url);
}
