---
rule: no-missing-exports
label: Defaults
---

```json title="smoker.config.json"
{
  "rules": {
    "no-missing-exports": [
      "error",
      {
        "types": true,
        "require": true,
        "import": true,
        "order": true,
        "glob": true
      }
    ]
  }
}
```
