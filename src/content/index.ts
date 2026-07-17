import { projects, posts } from './loader';
import type { Project } from './schemas';

export type { Project, Post } from './schemas';

export function getAllProjects() {
  return projects;
}

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug);
}

export function getAllPosts() {
  return posts;
}

export function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getFeaturedProjects(limit = 3) {
  return projects.filter((project) => project.featured).slice(0, limit);
}

/**
 * Up to `limit` OTHER projects (excludes the project matching `slug`),
 * preserving the existing sorted order (see `sortProjects` in loader.ts),
 * wrapping around from the current project's position so a project near
 * the end of the list still yields a full set. If `slug` isn't found,
 * returns the first `limit` projects.
 */
export function getMoreProjects(slug: string, limit = 3): Project[] {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index === -1) return projects.slice(0, limit);

  const rest: Project[] = [];
  for (let i = 1; i < projects.length && rest.length < limit; i++) {
    rest.push(projects[(index + i) % projects.length]);
  }
  return rest;
}

export function getLatestPosts(limit = 3) {
  return posts.slice(0, limit);
}
