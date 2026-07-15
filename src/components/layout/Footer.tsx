import { Link } from 'react-router-dom';
import { Container } from '../ui/Container';

const GITHUB_URL = 'https://github.com/dominiquebrom28';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-hairline bg-paper-raised">
      <Container className="flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-sm text-ink">
            Built by an AI team — 1 human + 9 AI characters, nothing ghostwritten.
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
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="min-h-11 inline-flex items-center text-ink-muted hover:text-ink hover:underline"
          >
            GitHub
          </a>
        </nav>
      </Container>
    </footer>
  );
}
