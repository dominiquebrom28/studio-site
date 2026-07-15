import { projects, posts } from './loader';

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

export function getLatestPosts(limit = 3) {
  return posts.slice(0, limit);
}
