import { POST_TITLE_TRANSITION_NAME } from "@/utils/postTitleTransition";

const CACHE_KEY = "lanhao:archive-state:v1";
const RESTORE_KEY = "lanhao:archive-restore:v1";

type ArchiveCacheState = {
  version: string;
  html: string;
  scrollY: number;
  anchorKey: string | null;
  anchorOffset: number;
};

let pendingRestore: ArchiveCacheState | null = null;

const readCache = (): ArchiveCacheState | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as ArchiveCacheState;
    return value && typeof value.html === "string" ? value : null;
  } catch {
    return null;
  }
};

const writeCache = (value: ArchiveCacheState) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Ignore quota/private-mode failures; the page still works without caching.
  }
};

const clearCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(RESTORE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const getArchiveRoot = (doc: Document = document) =>
  doc.querySelector<HTMLElement>("[data-archive-timeline]");

const getAnchor = (root: HTMLElement) => {
  const items = [...root.querySelectorAll<HTMLElement>("[data-archive-key]")];
  const anchor =
    items.find(item => item.getBoundingClientRect().bottom > 0) ?? items[0];

  return {
    key: anchor?.dataset.archiveKey ?? null,
    offset: anchor?.getBoundingClientRect().top ?? 0,
  };
};

const saveArchiveState = () => {
  const root = getArchiveRoot();
  if (!root?.dataset.archiveVersion) return;

  const anchor = getAnchor(root);

  writeCache({
    version: root.dataset.archiveVersion,
    html: root.innerHTML,
    scrollY: window.scrollY,
    anchorKey: anchor.key,
    anchorOffset: anchor.offset,
  });
};

const restoreArchiveDocument = (
  incomingDocument: Document,
  cache: ArchiveCacheState
) => {
  const root = getArchiveRoot(incomingDocument);
  if (!root) return false;

  if (root.dataset.archiveVersion !== cache.version) {
    clearCache();
    return false;
  }

  root.innerHTML = cache.html;
  return true;
};

const scrollInstant = (top: number) => {
  const html = document.documentElement;
  const previous = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, Math.max(0, top));
  requestAnimationFrame(() => {
    html.style.scrollBehavior = previous;
  });
};

const restoreScrollPosition = (cache: ArchiveCacheState) => {
  const root = getArchiveRoot();
  if (!root) return;

  const apply = () => {
    const target = cache.anchorKey
      ? [...root.querySelectorAll<HTMLElement>("[data-archive-key]")].find(
          item => item.dataset.archiveKey === cache.anchorKey
        )
      : null;

    if (target) {
      const targetTop =
        target.getBoundingClientRect().top +
        window.scrollY -
        cache.anchorOffset;
      scrollInstant(targetTop);
    } else {
      scrollInstant(cache.scrollY);
    }
  };

  // after-swap runs before the next paint, so this avoids showing the top first.
  apply();
  requestAnimationFrame(apply);
};

const nameIncomingArchiveTitle = (doc: Document, fromUrl: URL) => {
  const targetPath = new URL(fromUrl, location.href).pathname.replace(
    /\/+$/,
    ""
  );
  const titles = [...doc.querySelectorAll<HTMLElement>(".archive-post-title")];
  titles.forEach(title => title.style.removeProperty("view-transition-name"));

  const link = [
    ...doc.querySelectorAll<HTMLAnchorElement>("a.archive-post-link"),
  ].find(candidate => {
    const href = candidate.getAttribute("href");
    if (!href) return false;

    return (
      new URL(href, location.href).pathname.replace(/\/+$/, "") === targetPath
    );
  });
  const title = link?.querySelector<HTMLElement>(".archive-post-title");

  if (title) {
    title.style.viewTransitionName = POST_TITLE_TRANSITION_NAME;
  }
};

const restoreAfterSwap = () => {
  let shouldRestore = false;

  try {
    shouldRestore = sessionStorage.getItem(RESTORE_KEY) === "true";
  } catch {
    shouldRestore = pendingRestore !== null;
  }

  if (!shouldRestore) return;

  const cache = readCache() ?? pendingRestore;
  pendingRestore = null;

  try {
    sessionStorage.removeItem(RESTORE_KEY);
  } catch {
    // Ignore storage failures.
  }

  if (cache) restoreScrollPosition(cache);
};

const initArchiveState = () => {
  if (document.documentElement.dataset.archiveStateReady === "true") {
    return;
  }
  document.documentElement.dataset.archiveStateReady = "true";

  const navigationEntry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  if (navigationEntry?.type === "reload") clearCache();

  document.addEventListener("astro:before-swap", event => {
    if (getArchiveRoot()) saveArchiveState();

    const transitionEvent = event as Event & {
      newDocument?: Document;
      from?: URL;
    };
    const incomingDocument = transitionEvent.newDocument;
    if (!incomingDocument || !getArchiveRoot(incomingDocument)) return;

    /*
     * Only restore the cached archive when coming back from a post detail.
     * Entering from nav/home should behave like a fresh archive visit.
     */
    const fromPostDetail = /\/posts\//.test(window.location.pathname);
    if (!fromPostDetail) return;

    const cache = readCache();
    if (cache && restoreArchiveDocument(incomingDocument, cache)) {
      pendingRestore = cache;
      try {
        sessionStorage.setItem(RESTORE_KEY, "true");
      } catch {
        // The module-level fallback still restores scroll for this document.
      }
    }

    if (transitionEvent.from) {
      nameIncomingArchiveTitle(incomingDocument, transitionEvent.from);
    }
  });

  document.addEventListener("astro:after-swap", restoreAfterSwap);
  document.addEventListener("astro:page-load", restoreAfterSwap);
};

initArchiveState();

export {};
