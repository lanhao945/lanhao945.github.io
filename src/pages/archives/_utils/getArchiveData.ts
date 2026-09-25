import { getCollection, type CollectionEntry } from "astro:content";
import config from "@/config";
import { getPostUrl } from "@/utils/getPostPaths";
import { postFilter } from "@/utils/postFilter";

/** 首屏直接渲染的文章数量 */
export const ARCHIVE_INITIAL_ITEMS = 8;
/** 每次触底加载的文章数量 */
export const ARCHIVE_PAGE_SIZE = 8;

export type ArchivePostPayload = {
  year: number;
  month: number;
  title: string;
  description: string;
  publishedAt: string;
  timezone: string;
  url: string;
};

export async function getArchivePosts(): Promise<CollectionEntry<"posts">[]> {
  const posts = await getCollection("posts");

  return posts.filter(postFilter).sort((a, b) => {
    const dateDiff =
      b.data.pubDatetime.getTime() - a.data.pubDatetime.getTime();

    return dateDiff !== 0
      ? dateDiff
      : a.data.title.localeCompare(b.data.title, config.site.lang);
  });
}

export function serializeArchivePost(
  post: CollectionEntry<"posts">
): ArchivePostPayload {
  return {
    year: post.data.pubDatetime.getFullYear(),
    month: post.data.pubDatetime.getMonth() + 1,
    title: post.data.title,
    description: post.data.description,
    publishedAt: post.data.pubDatetime.toISOString(),
    timezone: post.data.timezone ?? config.site.timezone,
    url: getPostUrl(post.id, post.filePath, config.site.lang),
  };
}
