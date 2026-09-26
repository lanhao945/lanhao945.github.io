const CACHE_KEY = "lanhao:archive-state:v1";
const RESTORE_KEY = "lanhao:archive-restore:v1";

type ArchiveCacheState = {
  version: string;
  html: string;
  next: number;
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

  /*
   * Do not persist the transient enter animation. If the user leaves while a
   * batch is still fading in, restoring that class would make the same item
   * animate again during the view transition and look like a flash.
   */
  const snapshot = root.cloneNode(true) as HTMLElement;
  snapshot
    .querySelectorAll<HTMLElement>(".archive-post-enter")
    .forEach(item => {
      item.classList.remove("archive-post-enter");
      item.style.removeProperty("--archive-enter-delay");
    });

  writeCache({
    version: root.dataset.archiveVersion,
    html: snapshot.innerHTML,
    next: Number(root.dataset.archiveNext || 0),
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
  root.dataset.archiveNext = cache.next > 0 ? String(cache.next) : "";
  delete root.dataset.archiveLoadingReady;
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

    const incomingDocument = (event as Event & { newDocument?: Document })
      .newDocument;
    if (!incomingDocument) return;

    const cache = readCache();
    if (!cache) return;

    if (restoreArchiveDocument(incomingDocument, cache)) {
      pendingRestore = cache;
      try {
        sessionStorage.setItem(RESTORE_KEY, "true");
      } catch {
        // The module-level fallback still restores scroll for this document.
      }
    }
  });

  document.addEventListener("astro:after-swap", restoreAfterSwap);
  document.addEventListener("astro:page-load", restoreAfterSwap);
};

initArchiveState();

export {};
