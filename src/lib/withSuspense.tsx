import { Suspense, type ReactNode } from 'react';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { Container } from '@/components/ui/Container';

function RouteFallback() {
  return (
    <Container className="py-24 text-center">
      <p className="font-mono text-sm text-ink-muted">Loading…</p>
    </Container>
  );
}

export function withSuspense(node: ReactNode) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{node}</Suspense>
    </RouteErrorBoundary>
  );
}
