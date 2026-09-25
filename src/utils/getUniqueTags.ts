import type { CollectionEntry } from "astro:content";
import { postFilter } from "./postFilter";
import { slugifyAll, slugifyStr } from "./slugify";

type Tag = {
  tag: string;
  tagName: string;
};

export type TagWithCount = Tag & {
  count: number;
};

/**
 * Builds a de-duplicated, sorted tag list from posts.
 *
 * - Drafts and scheduled posts are excluded via `postFilter()`
 * - `tag` is the slug used in URLs; `tagName` is the original label for display
 * - Uniqueness is based on the slug (so differently-cased labels collapse)
 */
export function getUniqueTags(posts: CollectionEntry<"posts">[]) {
  const tags: Tag[] = posts
    .filter(postFilter)
    .flatMap(post => post.data.tags)
    .map(tag => ({ tag: slugifyStr(tag), tagName: tag }))
    .filter(
      (value, index, self) =>
        self.findIndex(tag => tag.tag === value.tag) === index
    )
    .sort((tagA, tagB) => tagA.tag.localeCompare(tagB.tag));
  return tags;
}

/**
 * Builds a tag list together with the number of eligible posts per tag.
 *
 * A tag repeated within the same post is counted once.
 */
export function getUniqueTagsWithCounts(
  posts: CollectionEntry<"posts">[]
): TagWithCount[] {
  const eligiblePosts = posts.filter(postFilter);
  const counts = new Map<string, number>();

  for (const post of eligiblePosts) {
    for (const tag of new Set(slugifyAll(post.data.tags))) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return getUniqueTags(eligiblePosts).map(tag => ({
    ...tag,
    count: counts.get(tag.tag) ?? 0,
  }));
}
