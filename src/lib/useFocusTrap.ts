import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps focus inside `containerRef` while `active`, closes on Escape, and
 * returns focus to the trigger element on close (design-brief §6 mobile
 * drawer / §9 keyboard order).
 *
 * `triggerRef`, if given, is the element the caller KNOWS opened the trap
 * (e.g. the hamburger button) — it's used as the definitive focus-return
 * target on close, in preference to whatever `document.activeElement`
 * happened to be when the trap engaged. That fallback-only capture is not
 * reliable on its own: a mouse click does not always move focus onto the
 * clicked element first (jsdom never does; neither does Safari desktop for
 * buttons), so without an explicit `triggerRef` the "trigger" this hook
 * captures can silently be `<body>` (or whatever was focused before) —
 * "returns focus to the trigger" then quietly fails to return focus
 * anywhere useful. `containerRef`'s caller (`Header.tsx`) had an unused
 * `triggerRef` sitting on its hamburger button for exactly this purpose
 * before it was wired up here — see that file's doc comment.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  triggerRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    const capturedActiveElement = document.activeElement as HTMLElement | null;
    // Captured once, synchronously, at effect-run time — NOT read off the
    // ref again inside the cleanup below. `triggerRef.current` is a mutable
    // ref; reading it fresh at cleanup time (whenever that eventually
    // fires) is exactly the stale/moved-ref hazard
    // `react-hooks/exhaustive-deps` warns about, even though in practice
    // `Header`'s hamburger button never gets reassigned to a different DOM
    // node for the life of the trap.
    const returnFocusTo = triggerRef?.current ?? capturedActiveElement;

    const focusables = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);

    const first = focusables()[0];
    first?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      returnFocusTo?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
