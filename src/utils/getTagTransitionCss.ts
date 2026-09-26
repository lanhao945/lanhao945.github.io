import { toTransitionName } from "./toTransitionName";

export const getTagTransitionName = (tag: string) =>
  `tag-${toTransitionName(tag)}`;

/**
 * View transitions for tag links/headings should morph only geometry:
 * hide the old snapshot and let the target snapshot animate to the new
 * position and size. This keeps the direction consistent in both ways.
 */
export const getTagTransitionCss = (tags: string[]) => {
  const rootCss = `
    ::view-transition-old(root) {
      animation: none !important;
      opacity: 0 !important;
      mix-blend-mode: normal;
    }
  `;

  const tagCss = tags
    .map(tag => {
      const name = getTagTransitionName(tag);

      return `
      ::view-transition-group(${name}) {
        animation-duration: 260ms;
        animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
        transform-origin: top left;
      }
      ::view-transition-old(${name}) {
        animation: none !important;
        opacity: 0 !important;
        mix-blend-mode: normal;
      }
      ::view-transition-new(${name}) {
        animation: none !important;
        opacity: 1 !important;
        mix-blend-mode: normal;
      }
    `;
    })
    .join("\n");

  return rootCss + tagCss;
};
