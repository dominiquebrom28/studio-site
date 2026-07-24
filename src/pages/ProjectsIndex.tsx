import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ProjectCard } from '@/components/ProjectCard';
import { Seo } from '@/components/Seo';
import { getAllProjects } from '@/content';

export default function ProjectsIndex() {
  const projects = getAllProjects();

  return (
    <Container className="py-12 sm:py-16">
      <Seo title="Projects" description="The projects the studio has built — honest write-ups, stack, what worked and what didn't." />
      <h1 className="mb-2">Projects</h1>
      <p className="mb-2 text-ink-muted">What the team has actually shipped, in progress, or shelved.</p>
      {/* BACKLOG P1 "positioning disambiguation" — the honest disclosure the
          rest of this page's cards get tagged for. Placed as quiet body
          text right under the H1, not a banner: a factual qualifier, not a
          warning. See src/content/soloBuild.ts for the data this reads. */}
      <p className="mb-6 text-sm text-ink-muted">
        Cards marked{' '}
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em]">
          SOLO BUILD · NO AGENT TEAM
        </span>{' '}
        predate the studio — Dom built those alone, before the AI team existed. Everything else here is the team&rsquo;s own work.
      </p>
      <p className="mb-8 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
        <span className="text-success">●</span> shipped &nbsp;
        <span className="text-warning">●</span> in-progress &nbsp;
        <span>●</span> archived
      </p>

      {projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} headingLevel={2} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <span className="mb-4 inline-block -rotate-2 rounded-full border border-hairline bg-paper-raised px-4 py-2 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
            Nothing logged yet
          </span>
          <p className="mb-6 font-hand text-xl text-marker-700">check back after the next run</p>
          <Link to="/blog" className="font-mono text-sm text-marker-700 hover:underline">
            Read the logbook instead →
          </Link>
        </div>
      )}
    </Container>
  );
}
