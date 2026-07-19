import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { Project } from '@/content';
import { Container } from '@/components/ui/Container';
import { Markdown } from '@/components/Markdown';
import { MediaGallery } from '@/components/MediaGallery';
import { ProjectHero } from '@/components/ProjectHero';
import { NarrativeBlock, NarrativeBullets } from '@/components/NarrativeBlock';
import { BuildTimeline } from '@/components/BuildTimeline';
import { SingleSittingStamp } from '@/components/SingleSittingStamp';
import { Seo } from '@/components/Seo';
import { getProjectBySlug, getMoreProjects } from '@/content';
import NotFound from './NotFound';

/** The one honest line of page furniture (docs/project-page-v2.md §1C) —
 * appears exactly once per page, directly under the Process H2. The only
 * place the recorded/inferred convention is spelled out in full sentences;
 * everywhere else it's carried by the `ProvenanceTag` + italic-vs-roman
 * mechanisms alone. Copy is the spec's own illustrative wording (§1C notes
 * it's "illustrative, not final" — the *mechanism* is what's binding). */
const PROCESS_FURNITURE_LINE =
  'Commit dates and counts below are logged straight from git history. Anything written as "probably" or "likely" is our reading of them, in italics — not verified fact. Tell us where it’s wrong.';

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

function BackLink() {
  const prefersReducedMotion = useReducedMotion();
  const motionProps = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: 'easeOut' as const } };

  return (
    <motion.div {...motionProps}>
      <Link to="/projects" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← All projects
      </Link>
    </motion.div>
  );
}

/**
 * Standard template (docs/project-page-v2.md §6.1) — SoulForge, LoveDiary,
 * MensApp, PizzaParty, Portfolio (and any project that hasn't been given
 * `goal`/`brief`/`process` content yet, which today is all six — every new
 * section below is conditionally rendered on its frontmatter field being
 * present, so a project with none of the v2 fields set renders exactly like
 * the v1 page plus the hero motion layer: graceful degradation, not a
 * partially-broken page).
 */
function StandardTemplate({ project, moreProjects }: { project: Project; moreProjects: Project[] }) {
  return (
    <>
      <ProjectHero project={project} />

      {project.goal && (
        <NarrativeBlock eyebrow="Why this exists" source={project.goal.source} heading="Why this exists">
          {project.goal.text}
        </NarrativeBlock>
      )}

      {project.brief && (
        <NarrativeBlock eyebrow="The brief" source={project.brief.source} heading="The brief" variant="card">
          <NarrativeBullets bullets={project.brief.bullets} />
        </NarrativeBlock>
      )}

      {project.process && (
        <section className="mb-10">
          <h2 className="mb-2">The process</h2>
          <p className="mb-6 font-mono text-[13px] text-ink-muted">{PROCESS_FURNITURE_LINE}</p>
          <BuildTimeline commits={project.process.commits} phases={project.process.phases} status={project.status} />
        </section>
      )}

      <MediaGallery items={project.media} />

      <Markdown ruled>{project.body}</Markdown>

      <div className="mt-10 border-t border-hairline pt-6">
        {moreProjects.length > 0 && (
          <div className="mb-4">
            <MoreProjectsList projects={moreProjects} />
          </div>
        )}
        <Link to="/projects" className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline">
          ← All projects
        </Link>
      </div>
    </>
  );
}

/**
 * Single-sitting template (docs/project-page-v2.md §2.4/§6.2) — currently
 * only Chart Token Playground (`template: "single-sitting"`). Reserved for
 * a project with nothing to put a timeline scaffold on; Why/Brief/Process
 * flatten into one short paragraph, then straight to media. The page is
 * short on purpose.
 */
function SingleSittingTemplate({ project, moreProjects }: { project: Project; moreProjects: Project[] }) {
  const firstCommit = project.process?.commits[0];

  return (
    <>
      <ProjectHero project={project} />

      {(project.goal || firstCommit) && (
        <section className="mb-10">
          <h2 className="mb-4">The moment</h2>
          {project.goal && <p className="mb-6 text-base leading-[1.65] text-ink italic">{project.goal.text}</p>}
          {firstCommit && (
            <SingleSittingStamp commitDate={firstCommit.date} sessionsNote={project.process?.sessionsNote} />
          )}
        </section>
      )}

      <MediaGallery items={project.media} />

      <Markdown ruled>{project.body}</Markdown>

      <div className="mt-10 border-t border-hairline pt-6">
        {moreProjects.length > 0 && (
          <div className="mb-4">
            <MoreProjectsList projects={moreProjects} />
          </div>
        )}
        <Link to="/projects" className="inline-flex min-h-11 items-center font-mono text-sm text-marker-700 hover:underline">
          ← All projects
        </Link>
      </div>
    </>
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
      <BackLink />

      <div className="mx-auto max-w-[720px]">
        {project.template === 'single-sitting' ? (
          <SingleSittingTemplate project={project} moreProjects={moreProjects} />
        ) : (
          <StandardTemplate project={project} moreProjects={moreProjects} />
        )}
      </div>
    </Container>
  );
}
