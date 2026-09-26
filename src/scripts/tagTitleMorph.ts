const TAG_TITLE_SELECTOR = "[data-tag-title]";
const TAG_DETAIL_SELECTOR = "[data-tag-title-detail]";

const clearCloudTagTitleNames = (doc: Document = document) => {
  doc
    .querySelectorAll<HTMLElement>(TAG_TITLE_SELECTOR)
    .forEach(title => title.style.removeProperty("view-transition-name"));
};

const nameTagTitle = (element: HTMLElement) => {
  const name = element.dataset.tagTitle;
  if (name) element.style.viewTransitionName = name;
};

/**
 * 词云里和“来源标签页”同一个标签的那个词。
 *
 * 按 transition name（由标签 slug 派生）匹配，而不是按 URL：标签页翻页后
 * 地址会变成 `/tags/<标签>/2`，用路径匹配就再也找不到云里的那个词了。
 */
const findCloudTagTitle = (doc: Document, tagName: string) =>
  [...doc.querySelectorAll<HTMLElement>(TAG_TITLE_SELECTOR)].find(
    title => title.dataset.tagTitle === tagName
  ) ?? null;

const initTagTitleMorph = () => {
  if (document.documentElement.dataset.tagTitleMorphBound === "true") {
    return;
  }
  document.documentElement.dataset.tagTitleMorphBound = "true";

  document.addEventListener(
    "click",
    event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a");
      const title = link?.querySelector<HTMLElement>(TAG_TITLE_SELECTOR);
      if (!title) return;

      // 只让被点的那一个词参与过渡，云里其它词跟着整页一起淡入淡出。
      clearCloudTagTitleNames(document);
      nameTagTitle(title);
    },
    true
  );

  document.addEventListener("astro:before-swap", event => {
    const incomingDocument = (event as Event & { newDocument?: Document })
      .newDocument;
    if (!incomingDocument) return;

    // 云页会被 sessionStorage 缓存后回填，缓存里可能留着上一次的 name。
    clearCloudTagTitleNames(incomingDocument);

    // 目标是标签列表页：标题自带 name，直接用它做终点。
    if (incomingDocument.querySelector(TAG_DETAIL_SELECTOR)) return;

    // 只有从标签列表页返回时，云里才需要命名对应的那个词。
    const currentTagTitle =
      document.querySelector<HTMLElement>(TAG_DETAIL_SELECTOR);
    const tagName = currentTagTitle?.dataset.tagTitleDetail;
    if (!tagName) return;

    const title = findCloudTagTitle(incomingDocument, tagName);
    if (title) nameTagTitle(title);
  });

  document.addEventListener("astro:page-load", () => {
    window.setTimeout(() => clearCloudTagTitleNames(document), 800);
  });
};

initTagTitleMorph();

export {};
