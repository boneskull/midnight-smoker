---
rule: no-banned-files
label: Defaults
---

```json title="smoker.config.json"
{
  "rules": {
    "no-banned-files": ["error", {"allow": [], "deny": []}]
  }
}
```
