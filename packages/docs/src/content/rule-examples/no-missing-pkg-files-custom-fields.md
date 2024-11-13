---
rule: no-missing-pkg-files
label: Check Custom Fields
description: If the files referenced by the <code>despair</code> and/or <code>alienation</code> fields in the package's `package.json` are missing from the package artifact, this rule will fail.
---

```json title="smoker.config.json"
{
  "rules": {
    "no-missing-pkg-files": [
      "warn",
      {
        "fields": ["despair", "alienation"]
      }
    ]
  }
}
```
