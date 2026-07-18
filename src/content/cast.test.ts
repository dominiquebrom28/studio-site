import { describe, it, expect } from 'vitest';
import { cast, getCastMember, getCastMemberByName, specialists, projectLead } from './cast';

describe('cast', () => {
  it('has exactly nine characters (1 human + 9 AI characters framing, design-brief §7)', () => {
    expect(cast.length).toBe(9);
  });

  it('has exactly one Project Lead entry', () => {
    expect(cast.filter((member) => member.isLead).length).toBe(1);
    expect(projectLead.isLead).toBe(true);
  });

  it('specialists excludes the lead', () => {
    expect(specialists.every((member) => !member.isLead)).toBe(true);
    expect(specialists.length).toBe(8);
  });

  it('every member has a non-empty citation (the transparency device, never omitted)', () => {
    for (const member of cast) {
      expect(member.citation.length).toBeGreaterThan(0);
    }
  });

  // Bug 3 fix: `role` is a full job-description sentence — fine for the Cast
  // page's mono eyebrow, but it collapsed the blog-post signature block's
  // "Signed, {Character}, {role}" pattern into an unreadable run-on. `title`
  // is the short, byline-safe compression; `role` stays put for the Cast
  // page. This asserts the invariant that keeps the two from drifting back
  // into the same problem: `title` must always be meaningfully shorter.
  it('every member has a short `title` that is meaningfully shorter than the full `role` description', () => {
    for (const member of cast) {
      expect(member.title.length).toBeGreaterThan(0);
      expect(member.title.length).toBeLessThan(member.role.length);
      expect(member.title.length).toBeLessThanOrEqual(40);
    }
  });
});

describe('getCastMember', () => {
  it('returns the matching entry by id', () => {
    expect(getCastMember('architect').name).toBe('architect');
  });

  it('throws for an unknown id', () => {
    // @ts-expect-error — deliberately passing an invalid id to test the guard
    expect(() => getCastMember('not-a-real-id')).toThrow();
  });
});

describe('getCastMemberByName', () => {
  it('finds a real character by exact name', () => {
    expect(getCastMemberByName('Project Lead')?.id).toBe('lead');
    expect(getCastMemberByName('frontend-dev')?.id).toBe('frontend');
  });

  it('is case-insensitive', () => {
    expect(getCastMemberByName('project lead')?.id).toBe('lead');
    expect(getCastMemberByName('ARCHITECT')?.id).toBe('architect');
  });

  // Regression: previously only case was normalized, not surrounding
  // whitespace, so a frontmatter `author:` value with a stray leading or
  // trailing space (an easy hand-edited-YAML typo, e.g. `author: "architect "`)
  // silently fell through to "no role" instead of resolving the real cast
  // member.
  it('is whitespace-tolerant (a stray leading/trailing space in frontmatter should not degrade the match)', () => {
    expect(getCastMemberByName(' architect')?.id).toBe('architect');
    expect(getCastMemberByName('architect ')?.id).toBe('architect');
    expect(getCastMemberByName('  Project Lead  ')?.id).toBe('lead');
  });

  it('returns undefined for an author who is not one of the nine characters, rather than inventing a match', () => {
    expect(getCastMemberByName('Dom')).toBeUndefined();
    expect(getCastMemberByName('Someone Else')).toBeUndefined();
  });
});
