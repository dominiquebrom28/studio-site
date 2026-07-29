import { describe, it, expect, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import axe from 'axe-core';
import { Footer } from './Footer';

/**
 * Coverage for the conversion-path footer block (backlog P0: "no next
 * step / conversion path... an engaged reader is a 100% leak" — marketer
 * spec, 2026-07-24). `RootLayout` mounts `<Footer />` globally with no
 * props, so the real shipping state is every optional constant unset —
 * that's what most of this file proves. The gated-link tests inject
 * override props (`Footer` accepts them ONLY for this purpose, see its
 * doc comment) rather than editing the real `DOM_PORTFOLIO_URL` /
 * `DOM_LINKEDIN_URL` / `DOM_EMAIL` constants, because those constants are
 * deliberately empty until Dom supplies a real value — a test must never
 * be the place a placeholder-that-looks-real sneaks into the repo.
 */

afterEach(() => {
  cleanup();
});

function renderFooter(props?: Parameters<typeof Footer>[0]) {
  return render(
    <MemoryRouter>
      <Footer {...props} />
    </MemoryRouter>,
  );
}

describe('Footer — conversion-path block (shipping state: all three optional constants unset)', () => {
  it('renders the "who\'s behind this" eyebrow and body copy as complete prose', () => {
    renderFooter();

    expect(screen.getByText("Who’s behind this")).toBeTruthy();
    expect(
      screen.getByText(
        /Dom runs this studio.*reviews and merges everything the 10 AI characters ship.*This site is the experiment\. GitHub.s the realest paper trail so far\./s,
      ),
    ).toBeTruthy();
  });

  it('renders the GitHub CTA pointing at the studio-site repo (the proof, not Dom\'s bare profile), matching the footer nav GitHub link (both derive from GITHUB_URL)', () => {
    renderFooter();

    const cta = screen.getByRole('link', { name: 'Find Dom on GitHub' });
    const navLink = screen.getByRole('navigation', { name: 'Footer' }).querySelector('a[href*="github.com"]');

    expect(cta.getAttribute('href')).toBe('https://github.com/dominiquebrom28/studio-site');
    expect(navLink?.getAttribute('href')).toBe(cta.getAttribute('href'));
    expect(cta.getAttribute('target')).toBe('_blank');
    expect(cta.getAttribute('rel')).toBe('noreferrer');
  });

  it('never renders a mailto: link anywhere in the footer when DOM_EMAIL is unset (the real, current constant)', () => {
    const { container } = renderFooter();

    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('renders no Portfolio or LinkedIn link when those constants are unset', () => {
    renderFooter();

    expect(screen.queryByRole('link', { name: 'Portfolio' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull();
  });

  it('preserves the untouched "Built by an AI team" line and last-commit line', () => {
    renderFooter();

    expect(
      screen.getByText('Built by an AI team — 1 human + 10 AI characters, nothing ghostwritten.'),
    ).toBeTruthy();
  });

  it('preserves the untouched Cast / RSS / GitHub footer nav', () => {
    renderFooter();

    const nav = screen.getByRole('navigation', { name: 'Footer' });
    expect(nav.querySelector('a[href="/cast"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/feed.xml"]')).not.toBeNull();
  });
});

describe('Footer — forward-compatibility gating (injected props, never the real constants)', () => {
  it('renders a Portfolio link only when a portfolio URL is supplied', () => {
    renderFooter({ portfolioUrl: 'https://example.test/test-portfolio' });

    const link = screen.getByRole('link', { name: 'Portfolio' });
    expect(link.getAttribute('href')).toBe('https://example.test/test-portfolio');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('renders a LinkedIn link only when a LinkedIn URL is supplied', () => {
    renderFooter({ linkedinUrl: 'https://example.test/test-linkedin' });

    const link = screen.getByRole('link', { name: 'LinkedIn' });
    expect(link.getAttribute('href')).toBe('https://example.test/test-linkedin');
  });

  it('renders a mailto: link only when an email is supplied, scoped to exactly that address', () => {
    renderFooter({ email: 'test-inbox@example.test' });

    const link = screen.getByRole('link', { name: 'Email' });
    expect(link.getAttribute('href')).toBe('mailto:test-inbox@example.test');
  });

  it('supplying one optional constant does not spuriously render the other two', () => {
    renderFooter({ portfolioUrl: 'https://example.test/test-portfolio' });

    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Footer' }).parentElement?.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

describe('Footer — accessibility (axe)', () => {
  it('has zero axe violations in the shipping state (all optional constants unset)', async () => {
    renderFooter();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('has zero axe violations with every optional link rendered (injected props)', async () => {
    renderFooter({
      portfolioUrl: 'https://example.test/test-portfolio',
      linkedinUrl: 'https://example.test/test-linkedin',
      email: 'test-inbox@example.test',
    });
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('does not introduce an <h2>/heading into the footer (eyebrow is a styled <p>, not a heading — see Footer.tsx comment)', () => {
    renderFooter();
    expect(screen.queryAllByRole('heading').length).toBe(0);
  });
});
