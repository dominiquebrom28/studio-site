# Fixture report — produced path is a directory, not a file

`produced` lists FILES (§4.1). `content/a-directory` exists on disk (so it
passes the existence check) but is a directory — `git log --diff-filter=A`
would happily "resolve" it too, so this must be caught explicitly.

```yaml provenance
item: produced-is-directory-item
produced:
  - content/a-directory
authors: ["architect"]
```
