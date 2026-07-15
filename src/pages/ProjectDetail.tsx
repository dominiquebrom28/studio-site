import { Link, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Chip } from '@/components/ui/Badge';
import { Markdown } from '@/components/Markdown';
import { Seo } from '@/components/Seo';
import { getProjectBySlug } from '@/content';
import NotFound from './NotFound';

const statusLabel = { shipped: 'Shipped', 'in-progress': 'In progress', archived: 'Archived' } as const;

export default function ProjectDetail() {
  const { slug = '' } = useParams();
  const project = getProjectBySlug(slug);

  if (!project) return <NotFound />;

  return (
    <Container className="py-12 sm:py-16">
      <Seo title={project.title} description={project.summary} />
      <Link to="/projects" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← All projects
      </Link>

      <div className="mb-8 aspect-[16/9] w-full overflow-hidden rounded-sm bg-paper-raised">
        {project.cover ? (
          <img src={project.cover} alt={`${project.title} cover`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
            [ studio name tbd ] — no cover yet
          </div>
        )}
      </div>

      <div className="grid gap-10 lg:grid-cols-[68%_32%]">
        <div>
          <h1 className="mb-4">{project.title}</h1>
          <Markdown ruled>{project.body}</Markdown>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
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
        </aside>
      </div>
    </Container>
  );
}
