const CACHE_KEY = "lanhao:tag-cloud-state:v1";

type TagCloudCacheState = {
  version: string;
  html: string;
  scale: string;
  ready: string;
  key: string;
  viewportWidth: number;
  viewportHeight: number;
};

const readCache = (): TagCloudCacheState | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const value = JSON.parse(raw) as TagCloudCacheState;
    return value && typeof value.html === "string" ? value : null;
  } catch {
    return null;
  }
};

const writeCache = (value: TagCloudCacheState) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures; the cloud remains usable without caching.
  }
};

const clearCache = () => {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const getCloud = (doc: Document = document) =>
  doc.querySelector<HTMLElement>("[data-tag-cloud]");

const makeKey = (cloud: HTMLElement) => {
  const width = Math.round(cloud.clientWidth);
  const height = Math.round(cloud.clientHeight);
  const mode = window.matchMedia("(orientation: landscape)").matches
    ? "landscape"
    : "portrait";

  return `${mode}-${width}x${height}`;
};

const saveTagCloudState = () => {
  const cloud = getCloud();
  const shell = cloud?.parentElement;
  if (!cloud || !shell || !cloud.dataset.tagCloudVersion) return;

  const ready = cloud.dataset.ready;
  if (ready !== "true" && ready !== "false") return;

  const snapshot = shell.cloneNode(true) as HTMLElement;
  const snapshotCloud = snapshot.querySelector<HTMLElement>("[data-tag-cloud]");
  if (!snapshotCloud) return;

  snapshotCloud.removeAttribute("data-cloud-ready");
  snapshotCloud.removeAttribute("data-cloud-restored-key");

  writeCache({
    version: cloud.dataset.tagCloudVersion,
    html: snapshot.innerHTML,
    scale: cloud.style.getPropertyValue("--cloud-scale"),
    ready,
    key: makeKey(cloud),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });
};

const restoreTagCloudDocument = (
  incomingDocument: Document,
  cache: TagCloudCacheState
) => {
  const cloud = getCloud(incomingDocument);
  const shell = cloud?.parentElement;
  if (!cloud || !shell) return false;

  if (cloud.dataset.tagCloudVersion !== cache.version) {
    clearCache();
    return false;
  }

  const viewportChanged =
    Math.abs(window.innerWidth - cache.viewportWidth) > 2 ||
    Math.abs(window.innerHeight - cache.viewportHeight) > 2;
  if (viewportChanged) {
    clearCache();
    return false;
  }

  shell.innerHTML = cache.html;

  const restored = shell.querySelector<HTMLElement>("[data-tag-cloud]");
  if (!restored) return false;

  if (cache.scale) {
    restored.style.setProperty("--cloud-scale", cache.scale);
  }
  restored.dataset.ready = cache.ready;
  restored.dataset.cloudRestoredKey = cache.key;
  return true;
};

const initTagCloudState = () => {
  if (document.documentElement.dataset.tagCloudStateBound === "true") {
    return;
  }
  document.documentElement.dataset.tagCloudStateBound = "true";

  document.addEventListener("astro:before-preparation", () => {
    saveTagCloudState();
  });

  document.addEventListener("astro:before-swap", event => {
    const incomingDocument = (event as Event & { newDocument?: Document })
      .newDocument;
    if (!incomingDocument) return;

    const cache = readCache();
    if (!cache) return;

    restoreTagCloudDocument(incomingDocument, cache);
  });
};

initTagCloudState();

export {};
