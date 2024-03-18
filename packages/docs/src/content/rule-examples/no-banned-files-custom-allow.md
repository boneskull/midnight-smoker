---
rule: no-banned-files
label: Explicitly Allow Banned Files
description: This explicitly allows a SSH private key file in your package artifacts, which is profoundly bad idea. But at least you're printing a warning, right? Good job today.
---

```json title="smoker.config.json"
{
  "rules": {
    "no-banned-files": ["warn", {"allow": ["id_rsa"]}]
  }
}
```
