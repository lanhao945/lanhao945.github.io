import type { APIRoute, GetStaticPaths } from "astro";
import {
  ARCHIVE_INITIAL_ITEMS,
  ARCHIVE_PAGE_SIZE,
  getArchivePosts,
  serializeArchivePost,
  type ArchivePostPayload,
} from "../_utils/getArchiveData";

type ArchiveChunkProps = {
  posts: ArchivePostPayload[];
  next: number | null;
};

export const getStaticPaths = (async () => {
  const posts = await getArchivePosts();
  const remaining = posts
    .slice(ARCHIVE_INITIAL_ITEMS)
    .map(serializeArchivePost);
  const pageCount = Math.ceil(remaining.length / ARCHIVE_PAGE_SIZE);

  return Array.from({ length: pageCount }, (_, index) => ({
    params: { page: String(index + 1) },
    props: {
      posts: remaining.slice(
        index * ARCHIVE_PAGE_SIZE,
        (index + 1) * ARCHIVE_PAGE_SIZE
      ),
      next: index + 1 < pageCount ? index + 2 : null,
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<ArchiveChunkProps> = ({ props }) =>
  new Response(JSON.stringify(props), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
