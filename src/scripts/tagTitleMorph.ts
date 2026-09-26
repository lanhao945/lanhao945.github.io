const TAG_TITLE_SELECTOR = "[data-tag-title]";
const TAG_DETAIL_SELECTOR = "[data-tag-title-detail]";

const clearTagTitleNames = (doc: Document = document) => {
  doc
    .querySelectorAll<HTMLElement>(TAG_TITLE_SELECTOR)
    .forEach(title => title.style.removeProperty("view-transition-name"));
};

const normalizePath = (value: string | URL) =>
  new URL(value, location.href).pathname.replace(/\/+$/, "");

/**
 * 词云里对应“来源标签页”的那个词。
 *
 * 只考虑内部带标签文字的链接，并且跳过 `#` 锚点：页面顶部的跳转链接解析出来
 * 同样等于当前地址，会把真正的匹配顶掉。
 */
const findMatchingTagTitle = (doc: Document, fromUrl: URL) => {
  const targetPath = normalizePath(fromUrl);
  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a[href]")];

  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) continue;

    const title = link.querySelector<HTMLElement>(TAG_TITLE_SELECTOR);
    if (!title) continue;

    if (normalizePath(href) === targetPath) return title;
  }

  return null;
};

const nameTagTitle = (element: HTMLElement) => {
  const name = element.dataset.tagTitle;
  if (name) element.style.viewTransitionName = name;
};

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
      clearTagTitleNames(document);
      nameTagTitle(title);
    },
    true
  );

  document.addEventListener("astro:before-swap", event => {
    const transitionEvent = event as Event & {
      newDocument?: Document;
      from?: URL;
    };
    const incomingDocument = transitionEvent.newDocument;
    const from = transitionEvent.from;

    if (!incomingDocument || !from) return;

    // 云页会被 sessionStorage 缓存后回填，缓存里可能留着上一次的 name。
    clearTagTitleNames(incomingDocument);

    // 目标是标签列表页：标题自带 name，直接用它做终点。
    if (incomingDocument.querySelector(TAG_DETAIL_SELECTOR)) return;
    // 只有从标签列表页返回时，云里才需要命名对应的那个词。
    if (!document.querySelector(TAG_DETAIL_SELECTOR)) return;

    const title = findMatchingTagTitle(incomingDocument, from);
    if (title) nameTagTitle(title);
  });

  document.addEventListener("astro:page-load", () => {
    window.setTimeout(() => clearTagTitleNames(document), 800);
  });
};

initTagTitleMorph();

export {};
