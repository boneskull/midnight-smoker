exports['midnight-smoker [E2E] linting when a rule fails when the rule severity is "error" should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: lint using four (4) rules in check-error using npm@<version> (system)

Smokin'…
ERROR: Issue found in package check-error:
│ ./package.json:
│   ✖ [no-banned-files] — Banned file found: id_rsa (Private SSH key)
Maurice!
`

exports['midnight-smoker [E2E] linting when a rule fails when the rule severity is "warn" should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: lint using four (4) rules in check-warn using npm@<version> (system)

Smokin'…
WARN: Issue found in package check-warn:
│ ./package.json:
│   ⚠ [no-banned-files] — Banned file found: id_rsa (Private SSH key)
Maurice!
`

exports['midnight-smoker [E2E] linting when a rule fails when the rule severity is "off" should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: lint using three (3) rules in check-off using npm@<version> (system)

Smokin'…
Lovey-dovey!
`
