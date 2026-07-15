import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Container } from '../ui/Container';
import { ThemeToggle } from '../ui/ThemeToggle';
import { NavItem } from './NavItem';
import { useFocusTrap } from '@/lib/useFocusTrap';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/blog', label: 'Blog' },
  { to: '/cast', label: 'Cast' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useFocusTrap(drawerRef, drawerOpen, () => setDrawerOpen(false));

  return (
    <header
      className={`sticky top-0 z-30 bg-paper transition-[border-color] duration-150 ${
        scrolled ? 'border-b border-hairline' : 'border-b border-transparent'
      }`}
    >
      <Container className="flex h-16 items-center justify-between">
        {/* Placeholder wordmark — no studio name exists yet (design-brief §1). Swap before launch. */}
        <Link
          to="/"
          className="font-mono text-sm font-semibold uppercase tracking-[0.06em] text-ink"
        >
          [ studio name tbd ]
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavItem key={link.to} to={link.to}>
              {link.label}
            </NavItem>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
        </div>

        <button
          ref={triggerRef}
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-hairline text-ink md:hidden"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </Container>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--ink)]/40"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="paper-grain-container relative ml-auto flex h-full w-[min(85vw,320px)] flex-col gap-1 bg-paper p-6 shadow-[var(--shadow-card)] motion-safe:animate-[drawer-in_220ms_ease-in-out]"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">Menu</span>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-hairline text-ink"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <NavItem key={link.to} to={link.to} onClick={() => setDrawerOpen(false)}>
                  {link.label}
                </NavItem>
              ))}
            </nav>
            <div className="mt-auto pt-6">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
