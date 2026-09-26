import { POST_TITLE_TRANSITION_NAME } from "./postTitleTransition";
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
      display: none !important;
      animation: none !important;
      opacity: 0 !important;
      mix-blend-mode: normal;
    }

    ::view-transition-old(${POST_TITLE_TRANSITION_NAME}) {
      display: none !important;
    }
  `;

  const tagCss = tags
    .map(tag => {
      const name = getTagTransitionName(tag);

      return `
      ::view-transition-group(${name}) {
        animation-duration: 520ms;
        animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1);
        transform-origin: top left;
        animation-fill-mode: both;
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
