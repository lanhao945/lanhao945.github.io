import { POST_TITLE_TRANSITION_NAME } from "@/utils/postTitleTransition";

const TITLE_SELECTOR = "[data-post-title]";

const clearTitleNames = (doc: Document = document) => {
  doc
    .querySelectorAll<HTMLElement>(TITLE_SELECTOR)
    .forEach(title => title.style.removeProperty("view-transition-name"));
};

const normalizePath = (value: string | URL) =>
  new URL(value, location.href).pathname.replace(/\/+$/, "");

/**
 * Find the title of the post we are coming from inside the incoming document.
 *
 * Only anchors that actually wrap a post title take part: the skip link
 * (`#main-content`) resolves to the current URL as well, so matching every
 * anchor would always hit that one first and swallow the real match.
 */
const findMatchingTitle = (doc: Document, fromUrl: URL) => {
  const targetPath = normalizePath(fromUrl);

  const link = [...doc.querySelectorAll<HTMLAnchorElement>("a[href]")].find(
    candidate => {
      const href = candidate.getAttribute("href");
      if (!href || href.startsWith("#")) return false;

      const title = candidate.querySelector<HTMLElement>(TITLE_SELECTOR);
      if (!title) return false;

      return normalizePath(href) === targetPath;
    }
  );

  return link?.querySelector<HTMLElement>(TITLE_SELECTOR) ?? null;
};

const hasDetailTitleName = (doc: Document) =>
  [...doc.querySelectorAll<HTMLElement>("[style]")].some(
    element => element.style.viewTransitionName === POST_TITLE_TRANSITION_NAME
  );

const initPostTitleMorph = () => {
  if (document.documentElement.dataset.postTitleMorphBound === "true") {
    return;
  }
  document.documentElement.dataset.postTitleMorphBound = "true";

  document.addEventListener(
    "click",
    event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>("a");
      const title = link?.querySelector<HTMLElement>(TITLE_SELECTOR);
      if (!title) return;

      clearTitleNames(document);
      title.style.viewTransitionName = POST_TITLE_TRANSITION_NAME;
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

    clearTitleNames(incomingDocument);

    // Post detail pages already name their own heading, everything else gets
    // the matching list / archive / tag title named for the return trip.
    if (hasDetailTitleName(incomingDocument)) return;
    if (!/\/posts\//.test(from.pathname)) return;

    const title = findMatchingTitle(incomingDocument, from);
    if (title) title.style.viewTransitionName = POST_TITLE_TRANSITION_NAME;
  });

  document.addEventListener("astro:page-load", () => {
    window.setTimeout(() => clearTitleNames(document), 800);
  });
};

initPostTitleMorph();

export {};
