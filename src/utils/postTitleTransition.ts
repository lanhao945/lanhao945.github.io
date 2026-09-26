/**
 * A single shared View Transition name for the post title morph.
 *
 * Only one post title is given this name at a time, so archive -> detail and
 * detail -> archive never create morph paths for unrelated titles.
 */
export const POST_TITLE_TRANSITION_NAME = "post-title-morph";

/**
 * Styles for the post title morph.
 *
 * They are injected globally (see `Layout.astro`) instead of only on the
 * detail page: when moving back to a list / archive / tag page the *incoming*
 * document is the one providing ::view-transition styles, so the same
 * duration, easing and staged crossfade must exist there as well.
 */
export const getPostTitleTransitionCss = () => `
      ::view-transition-group(${POST_TITLE_TRANSITION_NAME}) {
        animation-duration: 520ms;
        animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1);
        transform-origin: top left;
        animation-fill-mode: both;
      }
      ::view-transition-old(${POST_TITLE_TRANSITION_NAME}) {
        inline-size: 100% !important;
        block-size: 100% !important;
        object-fit: fill !important;
        animation: lanhao-title-old 520ms cubic-bezier(0.33, 0, 0.2, 1) both;
      }
      ::view-transition-new(${POST_TITLE_TRANSITION_NAME}) {
        inline-size: 100% !important;
        block-size: 100% !important;
        object-fit: fill !important;
        animation: lanhao-title-new 520ms cubic-bezier(0.33, 0, 0.2, 1) both;
      }
      @keyframes lanhao-title-old {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes lanhao-title-new {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
    `;
