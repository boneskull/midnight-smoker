exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "error" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/4 rules…
✖ 1 rule of 4 failed
✖ Issues found in package check-error:
│ ✖ Banned file found: id_rsa (Private SSH key) [no-banned-files]
✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "warn" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/4 rules…
✖ 1 rule of 4 failed
⚠ Issues found in package check-warn:
│ ⚠ Banned file found: id_rsa (Private SSH key) [no-banned-files]
✔ Lovey-dovey! 💖
`

exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "off" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/3 rules…
✔ Successfully executed three (3) rules
✔ Lovey-dovey! 💖
`
