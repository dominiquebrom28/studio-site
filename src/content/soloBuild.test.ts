import { describe, it, expect } from 'vitest';
import { soloBuildLabel } from './soloBuild';

describe('soloBuildLabel', () => {
  it('returns the standard-template wording', () => {
    expect(soloBuildLabel('standard')).toBe('SOLO BUILD · NO AGENT TEAM');
  });

  it('returns the single-sitting variant wording', () => {
    expect(soloBuildLabel('single-sitting')).toBe('ONE SITTING · SOLO BUILD');
  });
});
