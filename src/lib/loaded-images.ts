/**
 * Image addresses that have finished loading somewhere on the page. An image shown again (a carousel's copy of a
 * card, a card revisited after the loop jumps back) can then appear at once: no placeholder, no fade-in.
 */
const loaded = new Set<string>();

export const isImageLoaded = (src?: string) => !!src && loaded.has(src);

export const markImageLoaded = (src?: string) => {
  if (src) loaded.add(src);
};

/** Downloads and decodes an image ahead of time, then records it as loaded */
export function preloadImage(src: string) {
  if (loaded.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  img
    .decode()
    .then(() => markImageLoaded(src))
    .catch(() => {
      /* a failed preload just means the card loads it the normal way */
    });
}
