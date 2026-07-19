import { domAnimation, type FeatureBundle } from 'framer-motion';

/**
 * Deferred Framer Motion feature bundle for `LazyMotion` (see
 * `ProjectDetail`'s `<LazyMotion features={loadMotionFeatures} strict>`).
 *
 * This module's only export is `domAnimation` — it exists so that importing
 * it via `import()` (never statically) gives the bundler a clean split
 * point: `domAnimation`'s dependency graph (the actual animation engine)
 * lands in its own chunk, fetched only once a route that needs motion
 * mounts, instead of being bundled into that route's initial JS payload.
 *
 * `domAnimation` covers everything this project's motion actually uses —
 * `whileInView`, `initial`/`animate`, `useScroll`/`useTransform` (hooks,
 * unaffected by `LazyMotion` either way) — but not `layout` animations or
 * `drag`, which live in the heavier `domMax` bundle. Nothing here uses
 * either, so `domAnimation` is the right (smaller) choice. If a future
 * effect needs `domMax`, that's a deliberate cost/benefit call for Dom,
 * not a silent upgrade.
 */
const features: FeatureBundle = domAnimation;

export default features;
