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
    type: z.enum(["教育", "证书", "论文", "专利", "项目", "工作", "记录"]),
    /** 附加说明，例如专利号、会议名、时间段 */
    meta: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    links: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
  }),
});

/**
 * 项目经历：中性项目名 + 一句话简介（放蛇形框里），正文是 hover 时展示的详情。
 * 约定：不写公司/甲方名称，仓库链接由 front-matter 提供。
 */
const projects = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
  schema: z.object({
    /** 展示名（对方要求：不含公司名） */
    name: z.string(),
    /** 起止时间，形如 2025-05 / 2026-07 */
    start: z.string(),
    end: z.string().optional(),
    /** 我在这项目里的角色 */
    role: z.string(),
    /** 一句话简介，显示在蛇形框里 */
    summary: z.string(),
    /** 技术栈 / 关键词 */
    stack: z.array(z.string()).default([]),
    /** 参与过的仓库（私有仓库访客可能打不开） */
    repos: z
      .array(z.object({ label: z.string(), url: z.string() }))
      .default([]),
    /** 手动排序权重（越小越靠前）；不写则按 start 倒序 */
    weight: z.number().optional(),
  }),
});

export const collections = { posts, timeline, projects };
