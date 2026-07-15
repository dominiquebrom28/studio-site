import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Container } from './ui/Container';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Route-level error boundary (spec §4 P3 / §5 #10-#12): catches a malformed
 * render (e.g. bad content passing Zod but breaking a component) and shows a
 * friendly message — never a stack trace in the UI.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary]', error, info.componentStack);
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Container className="py-24 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.06em] text-error">Something broke</p>
        <h1 className="mb-4">This page hit a snag.</h1>
        <p className="mb-8 text-ink-muted">
          Something didn't render correctly. Try reloading, or head back to the logbook home.
        </p>
        <Button to="/">Back to the logbook home</Button>
      </Container>
    );
  }
}
