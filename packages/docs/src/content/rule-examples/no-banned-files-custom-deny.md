---
rule: no-banned-files
label: Explicitly Ban Files
description: If <code>file_id.diz</code> and/or <code>.DS_Store</code> is found in the package artifact, the check will fail.
---

```json title="smoker.config.json"
{
  "rules": {
    "no-banned-files": {"deny": ["file_id.diz", ".DS_Store"]}
  }
}
```
