# Verified commit bursts — extracted 2026-07-19

**Generated mechanically** by the Project Lead from `git log --format='%cs'` against
each source repo, then counted per day. **This is the authoritative source for the
`process.commits` frontmatter.** Do not hand-transcribe from prose, do not
estimate, do not add or remove a burst. If a number here disagrees with a dossier
narrative, this file wins — it came straight from git.

The `isCleanupSweep` flag marks the 2026-07-16 sweep, when five repos each got a
single commit landing weeks of stalled working-tree changes within about 30
seconds of each other. It is one event across five projects, not five separate
returns to work.

```yaml
soulforge:
  - date: "2026-06-15"
    count: 9
  - date: "2026-07-16"
    count: 1
    isCleanupSweep: true

pizzaparty:
  - date: "2026-05-01"
    count: 4
  - date: "2026-07-16"
    count: 1
    isCleanupSweep: true

mensapp:
  - date: "2026-04-29"
    count: 7
  - date: "2026-04-30"
    count: 6
  - date: "2026-05-02"
    count: 8
  - date: "2026-05-04"
    count: 1
  - date: "2026-05-05"
    count: 1
  - date: "2026-07-16"
    count: 1
    isCleanupSweep: true

lovediary:
  - date: "2026-05-03"
    count: 1
  - date: "2026-05-04"
    count: 8
  - date: "2026-07-16"
    count: 1
    isCleanupSweep: true

portfolio:
  - date: "2026-07-06"
    count: 4
  - date: "2026-07-18"
    count: 1
    # NOT a cleanup sweep — this is the sticky-nav fix, real work, 12 days later.

chart-token-playground:
  - date: "2026-07-16"
    count: 1
    # The entire history. 39 files, 6,435 insertions, 0 deletions, one snapshot.
    # Gets the single-sitting template — there is no timeline to draw.
```

## Totals cross-check

| Project | Bursts | Total commits | Matches dossier? |
|---|---|---|---|
| soulforge | 2 | 10 | ✅ |
| pizzaparty | 2 | 5 | ✅ |
| mensapp | 6 | 24 | ✅ |
| lovediary | 3 | 10 | ✅ |
| portfolio | 2 | 5 | ✅ |
| chart-token-playground | 1 | 1 | ✅ |

## Notes for whoever writes the phase narratives

- **MensApp** is the only project with a genuine multi-burst rhythm: 7+6 commits
  on consecutive days, a day off, 8 in one evening, then two single-commit days
  (4th and 5th May) that together carry **+3,033 lines** — the quiz-system
  ambition spike. Then 72 days of silence.
- **LoveDiary's** shape is 1 scaffold commit, then 8 in one evening the next day.
- **SoulForge** is 9 commits in eleven hours, then a month, then the sweep.
- **Portfolio's** second burst is real work, not the sweep — do not flag it.
- Four of the six end on the sweep. That is the honest ending for those projects:
  not a conclusion, just the day someone tidied up.
