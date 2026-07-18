/**
 * The ten studio characters.
 *
 * Kept as ONE small typed module, not a markdown content collection — these
 * are fixed studio identities, not files writers add to (spec §2 /cast note).
 * Reconciled against `docs/persona-bible.md` (the authoritative source for
 * voice, running bits, and citations — landed after this module's first
 * draft, which was pulled from the design brief's own table). Where the
 * persona bible is honest that a specialist has "thin studio history so far"
 * (backend-dev, devops, security-auditor, qa-tester, marketer haven't
 * shipped studio-site work yet, since v1 is static with no backend/auth/
 * deploy pipeline), that caveat is kept here too rather than invented around.
 * visual-media is thin for a different reason: it was only hired the same
 * evening this roster grew to ten (reports/2026-07-18-visual-media-hire.md)
 * — one evening of real history, honestly flagged rather than padded.
 *
 * Names (v2, 2026-07-18): every entry also carries a `firstName` and
 * `pronouns` — designer-proposed, Dom-approved in person the same evening
 * (docs/persona-bible.md, "Names (v2, 2026-07-18)"). The existing `name`
 * field is untouched on purpose: it holds the discipline string ("designer",
 * "qa-tester", "Project Lead") that citations and running bits are written
 * against, and byline copy now reads `{firstName}, {name}`.
 */

export type CharacterId =
  | 'lead'
  | 'architect'
  | 'designer'
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'security'
  | 'qa'
  | 'marketer'
  | 'visual-media';

export interface CharacterEntry {
  id: CharacterId;
  /** Display name as it appears in copy. */
  name: string;
  /**
   * First name — designer-proposed, Dom-approved 2026-07-18 (persona-bible
   * "Names (v2)"). Real-person register, on purpose: bylines read
   * `{firstName}, {name}` (comma apposition, newsroom style), never
   * `{firstName} said` — the name licenses "characteristically", not quotes.
   */
  firstName: string;
  /** Pronouns — set alongside `firstName` in the same v2 naming pass. */
  pronouns: string;
  /**
   * Short title (2-4 words) for space-constrained, byline-adjacent contexts
   * (post byline, signature block: design-brief §5 "Signed, {Character},
   * {role}"). A faithful compression of `role` below — same words/concepts,
   * never a new descriptive claim about the character. `role`'s full
   * sentence stays reserved for the Cast page (`CharacterCard`'s mono
   * eyebrow), where the longer form belongs.
   */
  title: string;
  /** Full role/voice description — the Cast page's mono eyebrow line. */
  role: string;
  /** CSS custom-property name (without the leading --) for this character's tint. */
  tintVar: string;
  /** Voice tag — one line, mono. */
  voiceTag: string;
  /** Running bit — sourced from real material, never invented (persona-bible §3). */
  runningBit: string;
  /** The citation — the transparency device; never omit it (persona-bible §1/§5). */
  citation: string;
  /** Whether this is the Project Lead (full-width, distinguished card). */
  isLead: boolean;
}

export const cast: readonly CharacterEntry[] = [
  {
    id: 'lead',
    name: 'Project Lead',
    firstName: 'Nora',
    pronouns: 'she/her',
    title: 'Delegates and reviews',
    role: 'Understands the request, breaks it into tasks, deploys specialists, reviews and synthesizes the result',
    tintVar: 'tint-lead',
    voiceTag: 'measured, decisive, dry',
    runningBit:
      'Opens every engagement with a one-paragraph project brief before delegating — a literal standing rule, not a style choice. Never commits to main — all automated work happens on team/* branches, with Dom reviewing and merging.',
    citation: '~/.claude/CLAUDE.md ("Always start with a one-paragraph project brief"), studio-site/CLAUDE.md',
    isLead: true,
  },
  {
    id: 'architect',
    name: 'architect',
    firstName: 'Theo',
    pronouns: 'he/him',
    title: 'Specs, not code',
    role: 'New features, tech-stack decisions, data models, refactor plans — output is always a spec, never code',
    tintVar: 'tint-architect',
    voiceTag: 'precise, allergic to gold-plating',
    runningBit:
      '"Never over-engineer. No microservices, no premature abstraction" is a literal line in its own definition. On the studio’s very first run it scored PASS, 91/100, round 1, zero blocking issues, on the architecture spec.',
    citation: '.claude/agents/architect.md, reports/2026-07-15.md',
    isLead: false,
  },
  {
    id: 'designer',
    name: 'designer',
    firstName: 'Vera',
    pronouns: 'she/her',
    title: 'UX and visual direction',
    role: 'UX flows, wireframes, visual direction, design critique, component design',
    tintVar: 'tint-designer',
    voiceTag: 'opinionated, editorial',
    runningBit:
      '"One clear recommendation, not a menu" is its own standing rule. On the design-brief run it self-caught a third failing contrast pair — a dark-mode button label at 2.27:1 — while re-verifying the Judge’s other two catches, and fixed it in the same revision rather than waiting to be told.',
    citation: '.claude/agents/designer.md, reports/2026-07-15-design-brief.md',
    isLead: false,
  },
  {
    id: 'frontend',
    name: 'frontend-dev',
    firstName: 'Milo',
    pronouns: 'he/him',
    title: 'UI implementation',
    role: 'React/UI implementation, styling, client-side state, Phaser scenes',
    tintVar: 'tint-frontend',
    voiceTag: 'implementation-literal, reports only what was verified',
    runningBit:
      'Carries two distinct SoulForge scars: the "floating heads" bug — an LPC head-layer compositing bug where the head layer drew over empty space — and, separately, an undocumented 32-file Phaser asset-loader cap that silently stalled the loader into a blank scene with no error thrown.',
    citation: 'reports/2026-07-15-design-brief.md, SoulForge commit bfc11e6 ("fix loader stall")',
    isLead: false,
  },
  {
    id: 'backend',
    name: 'backend-dev',
    firstName: 'Bram',
    pronouns: 'he/him',
    title: 'APIs and Supabase',
    role: 'APIs, Supabase schema/RLS, business logic, integrations, auth',
    tintVar: 'tint-backend',
    voiceTag: 'terse, rules-first',
    runningBit:
      '"RLS on every table, no exceptions" is the literal first non-negotiable rule in its own definition — will not let "add auth later" pass review. Thin studio history so far: this site is static with no backend, so no studio-site incident exists yet to cite beyond the standing rule.',
    citation: '.claude/agents/backend-dev.md',
    isLead: false,
  },
  {
    id: 'devops',
    name: 'devops',
    firstName: 'Otto',
    pronouns: 'they/them',
    title: 'Deployment & CI/CD',
    role: 'Deployment (Vercel), CI/CD, environments, monitoring, performance infra',
    tintVar: 'tint-devops',
    voiceTag: 'boring on purpose, twice-careful',
    runningBit:
      '"Managed services, minimal moving parts, boring and reliable" is its literal infra philosophy — will never deploy, delete resources, or touch DNS without Dom’s explicit go-ahead. Thin studio history so far: no studio-site deploy has happened yet to cite an incident from.',
    citation: '.claude/agents/devops.md',
    isLead: false,
  },
  {
    id: 'security',
    name: 'security-auditor',
    firstName: 'Karin',
    pronouns: 'she/her',
    title: 'Pre-deploy security review',
    role: 'Pre-deploy reviews, auth changes, anything handling user data or payments — read-only, reports never fixes',
    tintVar: 'tint-security',
    voiceTag: 'blunt, unhedged',
    runningBit:
      'Every audit ends in an explicit, capitalized verdict — SHIP or DO NOT SHIP — with no hedging permitted by its own rules. No studio-site audit has run yet (static, no-backend site) — noted honestly rather than invented.',
    citation: '.claude/agents/security-auditor.md',
    isLead: false,
  },
  {
    id: 'qa',
    name: 'qa-tester',
    firstName: 'Iris',
    pronouns: 'she/her',
    title: 'QA and testing',
    role: 'Test plans, writing tests, edge-case hunting, bug reproduction',
    tintVar: 'tint-qa',
    voiceTag: 'adversarial by design',
    runningBit:
      '"Test the happy path, then attack it" and "never soften a FAIL to be agreeable" are its own standing rules. No studio-site QA pass has been logged yet in the reports on file — noted as thin material rather than backfilled.',
    citation: '.claude/agents/qa-tester.md',
    isLead: false,
  },
  {
    id: 'marketer',
    name: 'marketer',
    firstName: 'Sanne',
    pronouns: 'she/her',
    title: 'Marketing and copy',
    role: 'Landing copy, launch plans, positioning, SEO, App Store / product descriptions',
    tintVar: 'tint-marketer',
    voiceTag: 'plain-spoken, allergic to hype',
    runningBit:
      '"Never fabricate testimonials, user counts, or claims the product can’t back up — placeholder slots are fine, fake proof is not" is its own literal rule. No studio-site launch has happened yet to cite an incident from — stated honestly rather than invented.',
    citation: '.claude/agents/marketer.md',
    isLead: false,
  },
  {
    id: 'visual-media',
    name: 'visual-media',
    firstName: 'Lucas',
    pronouns: 'he/him',
    title: 'Capture & verification',
    role: 'Screenshots, GIFs, and browser-based verification of real product states — the only agent with capture tooling, and the only one that works from what it sees rather than a spec or code',
    tintVar: 'tint-visual-media',
    voiceTag: 'observational, never evaluative',
    runningBit:
      'Its own brief’s settle-before-shooting rule is sourced from a real incident, not a guess: the Project Lead’s own pre-hire test shot fired mid-animation and caught the portfolio hero half-faded, so the first attempt at the studio’s newest capability produced the studio’s newest process rule.',
    citation: 'reports/2026-07-18-visual-media-hire.md, .claude/agents/visual-media.md',
    isLead: false,
  },
];

export function getCastMember(id: CharacterId): CharacterEntry {
  const entry = cast.find((member) => member.id === id);
  if (!entry) throw new Error(`Unknown cast member id: ${id}`);
  return entry;
}

/**
 * Case-insensitive, whitespace-tolerant lookup by display name — used to
 * source the plain-text role line in a blog post's signature block
 * (byline format v2: "Signed, {firstName}, {name}") and the post
 * byline/provenance rail, without hand-maintaining a second name→role
 * mapping. Trims before comparing: frontmatter `author:` values come from
 * hand-edited YAML, where a stray leading/trailing space (e.g.
 * `author: "architect "`) is an easy typo — that should still resolve to
 * the real cast member, not silently degrade to "no role" the way a
 * genuinely unrecognized author correctly does.
 *
 * Returns `undefined`, on purpose, for an author who isn't one of the ten
 * characters (e.g. "Dom", the human) — callers must handle that case by
 * omitting the role, never by inventing one.
 */
export function getCastMemberByName(name: string): CharacterEntry | undefined {
  const normalized = name.trim().toLowerCase();
  return cast.find((member) => member.name.toLowerCase() === normalized);
}

export const specialists = cast.filter((member) => !member.isLead);
export const projectLead = cast.find((member) => member.isLead)!;
