# Fixture report — two shipped items, two blocks

First item.

```yaml provenance
item: multi-a
produced:
  - content/multi-item-a.md
authors: ["designer"]
reviewers:
  - by: "qa-tester"
    kind: qa
judge: null
```

Second item, with a real Judge verdict and a token estimate.

```yaml provenance
item: multi-b
produced:
  - content/multi-item-b.md
authors: ["frontend-dev"]
judge: { verdict: PASS, round: 1, score: 91, outOf: 100 }
tokens: { approx: 12000, scope: run }
```
