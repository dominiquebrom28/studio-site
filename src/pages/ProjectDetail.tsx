import { Link, useParams } from 'react-router-dom';
import { LazyMotion, m, useReducedMotion } from 'framer-motion';
import type { Project } from '@/content';
import { Container } from '@/components/ui/Container';
import { Markdown } from '@/components/Markdown';
import { MediaGallery } from '@/components/MediaGallery';
import { ProjectHero } from '@/components/ProjectHero';
import { NarrativeBlock, NarrativeBullets } from '@/components/NarrativeBlock';
import { BuildTimeline } from '@/components/BuildTimeline';
import { SingleSittingStamp } from '@/components/SingleSittingStamp';
import { ProvenanceStrip } from '@/components/ProvenanceStrip';
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

/** Loaded lazily (never a static import) so the animation engine itself
 * lands in its own chunk, fetched only once this route mounts — see
 * `src/lib/motionFeatures.ts`. */
const loadMotionFeatures = () => import('@/lib/motionFeatures').then((res) => res.default);

/**
 * Project-page provenance colophon (docs/provenance-model.md §12 PR 7).
 *
 * `docs/project-page-v2.md` §7 explicitly excludes `ProvenanceStrip` from
 * this page, reasoning that reusing the blog's byline/avatar system here
 * would misattribute the SOFTWARE's authorship — these six projects are
 * Dom's own solo builds, not agent-team output, which is exactly what the
 * hero's "SOLO BUILD · NO AGENT TEAM" chip (`ProjectHero`) exists to keep
 * visible. That concern is real, but it is about a DIFFERENT claim than the
 * one this strip makes: `docs/provenance-model.md` §9 is explicit that this
 * feature "records how the write-up was produced, not how [the project] was
 * built" — i.e. who wrote *this page's copy*, not who wrote the software.
 * `reports/2026-07-16.md` gives real data for exactly that question (six
 * dossier-sourced write-ups, drafted by marketer, lead-reviewed) and
 * resolves the open question `reports/2026-07-17.md` explicitly left for
 * Dom ("do you want any honest provenance line on project-detail pages?")
 * with real data instead of the fabrication that was correctly refused then.
 *
 * Two placement choices carry the disambiguation:
 *  - Positioned as a colophon at the END of the page (after the write-up
 *    itself, before "More projects"), not beside the hero/SOLO BUILD chip —
 *    so the two claims are never visually adjacent or easy to conflate.
 *  - An explicit framing sentence, in the same plain mono-caption register
 *    as `PROCESS_FURNITURE_LINE` above, states the distinction in words
 *    rather than relying on position alone.
 *
 * `variant="inline"` only — `ProjectDetail` is a single centered column
 * post-project-page-v2 (no sticky rail the way `BlogPost` has), so the
 * rail register (graded-paper badge, labelled dt/dd rows) has nowhere to
 * live here and isn't rendered.
 *
 * `author` is deliberately omitted when `project.provenance` is absent
 * (`ProvenanceStrip`'s `author` prop is optional exactly for this case —
 * see its doc comment) rather than passed a guess: unlike a post, a project
 * has no independent "who wrote this" fact in its frontmatter, so with no
 * record there is nothing honest to credit. When a record exists, its own
 * `authors[0]` (a real derived fact, not a guess) is used.
 */
function ProjectProvenanceFooter({ project }: { project: Project }) {
  // `soloBuild` is the honest branch point: when true (all six real projects
  // today), the hero's "SOLO BUILD · NO AGENT TEAM" chip makes an explicit
  // claim this strip could otherwise be misread as contradicting, so the
  // disambiguation is spelled out by name. A future team-built project
  // (`soloBuild: false`) has no such contradiction to defuse — simpler copy.
  const framingLine = project.soloBuild
    ? `${project.title} is Dom’s own solo build (see the badge above) — this note is about how the page describing it was produced, not the software itself.`
    : `This note is about how the page describing ${project.title} was produced — see The Process above for the project’s own build history.`;

  return (
    <div className="mt-10 border-t border-hairline pt-6">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
        About this write-up
      </p>
      <p className="mb-3 font-mono text-[13px] text-ink-muted">{framingLine}</p>
      <ProvenanceStrip author={project.provenance?.authors[0]} provenance={project.provenance} variant="inline" />
    </div>
  );
}

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
  // Transform-only entrance (spec §5.3, 2026-07-19 P0 audit) — `initial` is
  // applied synchronously on mount with no rAF/timer required, so an
  // `opacity: 0` initial is the permanently-frozen state under
  // throttled/suspended rAF, not a transient one. `opacity` stays 1; only
  // `y` (rise) animates.
  const motionProps = prefersReducedMotion
    ? { initial: { y: 0 }, animate: { y: 0 } }
    : { initial: { y: 16 }, animate: { y: 0 }, transition: { duration: 0.35, ease: 'easeOut' as const } };

  return (
    <m.div {...motionProps}>
      <Link to="/projects" className="mb-6 inline-block font-mono text-sm text-ink-muted hover:text-ink hover:underline">
        ← All projects
      </Link>
    </m.div>
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

      {/* No `eyebrow` prop here on purpose — it would repeat the H2 below
          verbatim ("WHY THIS EXISTS" mono label over an "Why this exists"
          H2, announced twice by a screen reader). The `ProvenanceTag`
          stands alone in that row instead. */}
      {project.goal && (
        <NarrativeBlock source={project.goal.source} heading="Why this exists">
          {project.goal.text}
        </NarrativeBlock>
      )}

      {project.brief && (
        <NarrativeBlock source={project.brief.source} heading="The brief" variant="card">
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

      <ProjectProvenanceFooter project={project} />

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

      <ProjectProvenanceFooter project={project} />

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
    <LazyMotion features={loadMotionFeatures} strict>
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
    </LazyMotion>
  );
}
