import { getCollection, type CollectionEntry } from "astro:content";
import config from "@/config";
import { postFilter } from "@/utils/postFilter";

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
