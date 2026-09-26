import { POST_TITLE_TRANSITION_NAME } from "./postTitleTransition";
import { toTransitionName } from "./toTransitionName";

export const getTagTransitionName = (tag: string) =>
  `tag-${toTransitionName(tag)}`;

/**
 * 词云里的词 ↔ 标签列表页标题之间的形变。
 *
 * 与归档页/详情页的标题形变共用一套参数：旧快照淡出、新快照淡入，两张快照
 * 都拉伸填满同一个 group。这样位置、字号（以及颜色）是一起渐变的，而不是
 * “样式瞬间切换 + 只滑动位置”。
 *
 * 页面其余部分保持默认的整页交叉淡化：只有被点的那一个词单独形变。
 */
export const getTagTransitionCss = (tags: string[]) => {
  const rootCss = `
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
        inline-size: 100% !important;
        block-size: 100% !important;
        object-fit: fill !important;
        animation: lanhao-title-old 520ms cubic-bezier(0.33, 0, 0.2, 1) both;
      }
      ::view-transition-new(${name}) {
        inline-size: 100% !important;
        block-size: 100% !important;
        object-fit: fill !important;
        animation: lanhao-title-new 520ms cubic-bezier(0.33, 0, 0.2, 1) both;
      }
    `;
    })
    .join("\n");

  return rootCss + tagCss;
};
