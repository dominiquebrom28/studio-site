import { Link, useParams } from 'react-router-dom';
import type { Project } from '@/content';
import { Container } from '@/components/ui/Container';
import { Chip } from '@/components/ui/Badge';
import { Markdown } from '@/components/Markdown';
import { MediaGallery } from '@/components/MediaGallery';
import { Seo } from '@/components/Seo';
import { getProjectBySlug, getMoreProjects } from '@/content';
import { statusLabel, statusToneClass } from '@/content/status';
import NotFound from './NotFound';

/** Mono eyebrow label + up to `limit` text links to other projects (design
 * brief §5 "more projects mini-list at rail bottom" / mobile footer nav). */
function MoreProjectsList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) return null;

  return (
    <div>
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">More projects</p>
      <ul className="flex flex-col">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link
              to={`/projects/${project.slug}`}
              className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
            >
              {project.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) return <NotFound />;

  const moreProjects = getMoreProjects(project.slug, 3);

  return (
    <Container className="py-12 sm:py-16">
      <Seo title={project.title} description={project.summary} />
      <Link to="/projects" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← All projects
      </Link>

      <div className="mb-8 aspect-[16/9] w-full overflow-hidden rounded-sm bg-paper-raised">
        {project.cover ? (
          <img
            src={project.cover}
            alt={`${project.title} cover`}
            className="h-full w-full object-cover"
            // Likely the page's LCP element (large, above the fold) — never
            // lazy, and hinted high-priority so the gallery below (which IS
            // lazy-loaded) never contends with it.
            fetchPriority="high"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
            Dom&rsquo;s AI Studio — no cover yet
          </div>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[68%_32%]">
        <div>
          <h1 className="mb-4">{project.title}</h1>

          <MediaGallery items={project.media} />

          {/* Mobile/tablet meta strip — brief §5 mobile flow is H1 → status
              badge + stack chips → meta row (date) before the body. The
              sticky rail below duplicates this for lg+ only. */}
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className={`font-mono text-[11px] font-semibold uppercase tracking-[0.06em] ${statusToneClass[project.status]}`}
              >
                ● {statusLabel[project.status]}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{project.date}</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <Chip key={tech}>{tech}</Chip>
              ))}
            </div>
            {(project.repo || project.liveUrl) && (
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
                  >
                    Repository →
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
                  >
                    Live →
                  </a>
                )}
              </div>
            )}
          </div>

          <Markdown ruled>{project.body}</Markdown>

          {/* Mobile/tablet "next project" nav — the sticky rail (with its own
              more-projects mini-list) covers this at lg+. */}
          <div className="mt-10 border-t border-hairline pt-6 lg:hidden">
            {moreProjects.length > 0 && (
              <div className="mb-4">
                <MoreProjectsList projects={moreProjects} />
              </div>
            )}
            <Link
              to="/projects"
              className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
            >
              ← All projects
            </Link>
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-sm border border-hairline bg-paper-raised p-5 shadow-[var(--shadow-card)]">
            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Status</p>
            <p className="mb-4 font-mono text-sm font-semibold text-ink">{statusLabel[project.status]}</p>

            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Stack</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {project.stack.map((tech) => (
                <Chip key={tech}>{tech}</Chip>
              ))}
            </div>

            <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Date</p>
            <p className="mb-4 font-mono text-sm text-ink">{project.date}</p>

            {(project.repo || project.liveUrl) && (
              <div className="flex flex-col gap-2">
                {project.repo && (
                  <a
                    href={project.repo}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
                  >
                    Repository →
                  </a>
                )}
                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline"
                  >
                    Live →
                  </a>
                )}
              </div>
            )}
          </div>

          {moreProjects.length > 0 && (
            <div className="mt-6 border-t border-hairline pt-5">
              <MoreProjectsList projects={moreProjects} />
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
