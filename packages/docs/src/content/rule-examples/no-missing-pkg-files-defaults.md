---
rule: no-missing-pkg-files
label: Defaults
---

```json title="smoker.config.json"
{
  "rules": {
    "no-missing-pkg-files": [
      "error",
      {
        "bin": true,
        "browser": true,
        "types": true,
        "unpkg": true,
        "module": true,
        "fields": []
      }
    ]
  }
}
```
