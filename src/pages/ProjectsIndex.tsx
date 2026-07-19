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
      <p className="mb-4 text-ink-muted">What the team has actually shipped, in progress, or shelved.</p>
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
        <span className="text-success">●</span> shipped &nbsp;
        <span className="text-warning">●</span> in-progress &nbsp;
        <span>●</span> archived
      </p>
      {/* A light legend rather than grouping the grid by build-mode — with
          six solo projects and zero team ones today, splitting the grid
          into sections would mean one populated group and one empty one,
          which reads as more decisive than the current reality actually
          is. A project's card already carries its own build-mode chip (see
          `ProjectCard`), and — per Dom's revised idea — a project that
          started solo and had the team join later shows that handoff right
          on its own timeline, not as a separate category here. This line
          just names the convention once so the per-card chips read as a
          deliberate axis, not random variation; it holds up unchanged
          whether the mix is 6-and-0 or 5-and-2 later. */}
      <p className="mb-8 max-w-prose text-sm text-ink-muted">
        Every project is tagged solo or team on its card — and if the team joined partway through, that handoff shows up right on the project's own timeline.
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
