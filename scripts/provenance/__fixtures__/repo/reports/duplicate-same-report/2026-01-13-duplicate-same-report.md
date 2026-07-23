# Fixture report — the SAME item claims the same produced path twice, within one report

Two blocks, same `item` name, same `produced` path — the "which block do I
delete" case the cross-report duplicate message doesn't answer.

```yaml provenance
item: same-item
produced:
  - content/happy-item.md
authors: ["architect"]
```

```yaml provenance
item: same-item
produced:
  - content/happy-item.md
authors: ["designer"]
```
