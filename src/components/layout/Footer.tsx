import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';
import { Button } from '../ui/Button';

const GITHUB_URL = 'https://github.com/dominiquebrom28';

// Forward-compatibility constants for Dom's other public presences
// (conversion-path spec, 2026-07-24 — closes the site-wide "no next
// step" P0). Deliberately EMPTY STRINGS, not placeholder or guessed
// domains — publishing a portfolio link, a LinkedIn profile, or an email
// address is Dom's decision to make, not ours to invent on his behalf
// (PROJECT-BRIEF.md "never invent results"; email specifically requires
// his explicit sign-off, which has not been given as of this commit). Do
// NOT "helpfully" fill these in with a real-looking value — every render
// below is written to gate on non-empty, so wiring one up later is a
// one-line constant edit, not a redesign. The footer copy is written to
// read as a complete, finished sentence with all three unset, because
// that is the state actually shipping today.
const DOM_PORTFOLIO_URL = '';
const DOM_LINKEDIN_URL = '';
const DOM_EMAIL = '';

interface FooterProps {
  /**
   * Override hooks for the three forward-compat constants above, used
   * ONLY by tests to prove the non-empty-gated rendering branches work
   * (see Footer.test.tsx) without ever setting the real constants to a
   * fabricated value. Production (`RootLayout`) never passes these —
   * it always gets the real, currently-empty constants.
   */
  portfolioUrl?: string;
  linkedinUrl?: string;
  email?: string;
}

const optionalLinkClasses =
  'min-h-11 inline-flex items-center font-mono text-sm text-ink-muted hover:text-ink hover:underline';

export function Footer({
  portfolioUrl = DOM_PORTFOLIO_URL,
  linkedinUrl = DOM_LINKEDIN_URL,
  email = DOM_EMAIL,
}: FooterProps = {}) {
  return (
    <footer className="mt-16 border-t border-hairline bg-paper-raised">
      <Container className="py-8">
        {/*
          "Who's behind this" — the site-wide conversion path (backlog P0:
          "no contact, email, CTA, or 'who is Dom' anywhere"). RootLayout
          mounts <Footer /> globally, so this single block closes the leak
          at every disengagement point (end of a blog post, end of a
          project write-up, everywhere else) without a new route or a
          second CTA competing with it elsewhere on the page.

          Element choice — <p>, not a heading: this is a footer aside, not
          a new section of page content, and design-brief §9 is explicit
          that headings never skip a level and every page keeps a single
          clean outline ending at its last <h2>. Home's own hero eyebrow
          (the treatment this reuses verbatim) is a <p> above the real
          <h1> for the same reason. An eyebrow that became a stray <h2> in
          the footer would silently tack an extra, out-of-context heading
          onto the outline of every single page on the site — not worth it
          for a label that isn't sectioning anything.
        */}
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">
            Who&rsquo;s behind this
          </p>
          <p className="font-mono text-sm text-ink">
            Dom runs this studio — he reviews and merges everything the 10 AI characters ship;
            nothing goes out without his sign-off. This site is the experiment. GitHub&rsquo;s the
            realest paper trail so far.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href={GITHUB_URL} variant="secondary" target="_blank" rel="noreferrer">
              Find Dom on GitHub
            </Button>
            {portfolioUrl && (
              <Button href={portfolioUrl} variant="secondary" target="_blank" rel="noreferrer">
                Portfolio
              </Button>
            )}
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noreferrer" className={optionalLinkClasses}>
                LinkedIn
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className={optionalLinkClasses}>
                Email
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-sm text-ink">
              Built by an AI team — 1 human + 10 AI characters, nothing ghostwritten.
            </p>
            {__LAST_COMMIT_RELATIVE__ && (
              <p className="mt-1 font-mono text-xs text-ink-muted">
                last commit {__LAST_COMMIT_RELATIVE__}
              </p>
            )}
          </div>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-sm" aria-label="Footer">
            <Link to="/cast" className="min-h-11 inline-flex items-center text-ink-muted hover:text-ink hover:underline">
              Cast
            </Link>
            <a href="/feed.xml" className="min-h-11 inline-flex items-center text-ink-muted hover:text-ink hover:underline">
              RSS
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 inline-flex items-center text-ink-muted hover:text-ink hover:underline"
            >
              GitHub
            </a>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
