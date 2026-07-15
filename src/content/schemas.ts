import { z } from 'zod';

/** Kebab-case slug: lowercase letters, digits, hyphens; no leading/trailing/double hyphens. */
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const urlOrEmpty = z
  .string()
  .refine((value) => value === '' || /^https?:\/\//.test(value), {
    message: 'must be an http(s) URL',
  })
  .optional();

const isoDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'must be a valid ISO date string (e.g. "2026-07-15")',
});

export const ProjectFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(slugPattern, 'slug must be lowercase kebab-case')
    .optional(),
  summary: z.string().min(1).max(160),
  stack: z.array(z.string().min(1)).min(1),
  status: z.enum(['shipped', 'in-progress', 'archived']),
  repo: urlOrEmpty,
  liveUrl: urlOrEmpty,
  cover: z.string().optional(),
  featured: z.boolean().default(false),
  order: z.number().optional(),
  date: isoDate,
});

export type ProjectFrontmatter = z.infer<typeof ProjectFrontmatterSchema>;

export const PostFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z
    .string()
    .regex(slugPattern, 'slug must be lowercase kebab-case')
    .optional(),
  date: isoDate,
  summary: z.string().min(1).max(200),
  tags: z.array(z.string().min(1)).default([]),
  author: z.string().min(1).default('Dom'),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export interface Project extends ProjectFrontmatter {
  slug: string;
  body: string;
}

export interface Post extends PostFrontmatter {
  slug: string;
  body: string;
}
