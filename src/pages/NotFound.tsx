import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Seo } from '@/components/Seo';

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Seo title="404 — Studio Logbook" description="No entry at this address in the logbook." />
      <p
        className="mb-4 -rotate-[4deg] font-mono text-6xl font-bold text-error"
        aria-hidden="true"
      >
        404
      </p>
      <h1 className="mb-3">This page didn't make it past review.</h1>
      <p className="mb-2 text-ink-muted">No entry at this address in the logbook.</p>
      <p className="mb-8 font-hand text-xl text-marker-700" aria-hidden="true">
        Judge (Fable-5): FAIL, page not found, round 1
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button to="/">Back to the logbook home</Button>
        <Button to="/projects" variant="secondary">
          Browse projects
        </Button>
      </div>
    </Container>
  );
}
