import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter (browser-safe splitter + js-yaml)', () => {
  it('parses a standard frontmatter block with quoted strings', () => {
    const raw = `---
title: "SoulForge"
summary: "A gamified productivity RPG."
---

Body text here.`;
    const { data, content } = parseFrontmatter(raw);
    expect(data.title).toBe('SoulForge');
    expect(data.summary).toBe('A gamified productivity RPG.');
    expect(content).toBe('Body text here.');
  });

  it('parses arrays', () => {
    const raw = `---
stack: ["Vite", "React", "TypeScript"]
tags:
  - process
  - agents
---
Body.`;
    const { data } = parseFrontmatter(raw);
    expect(data.stack).toEqual(['Vite', 'React', 'TypeScript']);
    expect(data.tags).toEqual(['process', 'agents']);
  });

  it('parses dates as their literal ISO string, not a JS Date object', () => {
    // js-yaml's default schema auto-converts unquoted ISO-looking scalars to
    // Date objects, which would silently break `isoDate` schema validation
    // (a Zod z.string() check) downstream. Frontmatter dates in this project
    // are always quoted in content (e.g. `date: "2026-07-15"`), so verify
    // that path explicitly.
    const raw = `---
date: "2026-07-15"
---
Body.`;
    const { data } = parseFrontmatter(raw);
    expect(data.date).toBe('2026-07-15');
    expect(typeof data.date).toBe('string');
  });

  it('flags the real risk: an UNQUOTED YAML date scalar becomes a Date object, not a string', () => {
    const raw = `---
date: 2026-07-15
---
Body.`;
    const { data } = parseFrontmatter(raw);
    // This documents current (risky) behavior rather than asserting it's
    // fine: js-yaml's default `load()` schema parses bare `YYYY-MM-DD` as a
    // native Date. The Zod `isoDate` schema (schemas.ts) is `z.string()`,
    // so this would throw "Expected string, received date" at build time —
    // a real footgun if a future content author forgets to quote the date.
    // Caught here so it's a documented, intentional tradeoff, not a silent gap.
    expect(data.date instanceof Date).toBe(true);
  });

  it('preserves `---` that appears inside the body (e.g. a markdown horizontal rule)', () => {
    const raw = `---
title: "Post with a divider"
---

First paragraph.

---

Second paragraph after a horizontal rule.`;
    const { data, content } = parseFrontmatter(raw);
    expect(data.title).toBe('Post with a divider');
    expect(content).toContain('First paragraph.');
    expect(content).toContain('---');
    expect(content).toContain('Second paragraph after a horizontal rule.');
  });

  it('returns empty frontmatter and the raw trimmed body when there is no frontmatter block', () => {
    const raw = `Just a plain markdown file, no frontmatter at all.`;
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({});
    expect(content).toBe('Just a plain markdown file, no frontmatter at all.');
  });

  it('handles a completely empty file', () => {
    const { data, content } = parseFrontmatter('');
    expect(data).toEqual({});
    expect(content).toBe('');
  });

  it('handles an empty frontmatter block (opens and closes with nothing between)', () => {
    const raw = `---
---
Body only.`;
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({});
    expect(content).toBe('Body only.');
  });

  it('handles CRLF line endings in the frontmatter delimiter', () => {
    const raw = '---\r\ntitle: "CRLF test"\r\n---\r\nBody.';
    const { data, content } = parseFrontmatter(raw);
    expect(data.title).toBe('CRLF test');
    expect(content).toBe('Body.');
  });

  it('does not leak a Node `Buffer` global into the parse path', () => {
    // Regression guard for the exact defect gray-matter had (spec §3.3):
    // this module must never reference the Node `Buffer` global at runtime.
    const source = parseFrontmatter.toString();
    expect(source).not.toMatch(/\bBuffer\b/);
  });

  it('does not throw on frontmatter containing unicode and special characters', () => {
    const raw = `---
title: "Café — a “quoted” aside & <html> tag"
summary: "emoji test 🚀"
---
Body with unicode: héllo wörld 你好.`;
    const { data, content } = parseFrontmatter(raw);
    expect(data.title).toBe('Café — a “quoted” aside & <html> tag');
    expect(data.summary).toBe('emoji test 🚀');
    expect(content).toContain('你好');
  });
});
