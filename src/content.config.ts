import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(config.site.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
    }),
});

/**
 * 个人页时间轴的条目。
 * 页面只展示到「年」，month 仅用于同一年内的排序。
 */
const timeline = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/timeline",
  }),
  schema: z.object({
    year: z.number().int().min(1900).max(2199),
    month: z.number().int().min(1).max(12).optional(),
    title: z.string(),
    type: z.enum(["教育", "论文", "专利", "项目", "工作", "记录"]),
    /** 附加说明，例如专利号、会议名、时间段 */
    meta: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
  }),
});

export const collections = { posts, timeline };
