---
rule: no-missing-pkg-files
label: Ignore Common Fields
description: If files referenced by these common fields are missing from the package artifact, this rule will not fail.
---

```json title="smoker.config.json"
{
  "rules": {
    "no-missing-pkg-files": {
      "bin": false,
      "browser": false,
      "types": false,
      "unpkg": false,
      "module": false
    }
  }
}
```
