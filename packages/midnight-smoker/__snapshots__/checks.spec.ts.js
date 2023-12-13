exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "error" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/4 checks…
✖ 1 check of 4 failed
✖ Issues found in package check-error:
│ ✖ Banned file found: id_rsa (Private SSH key) [no-banned-files]
✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "warn" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/4 checks…
✖ 1 check of 4 failed
⚠ Issues found in package check-warn:
│ ⚠ Banned file found: id_rsa (Private SSH key) [no-banned-files]
✔ Lovey-dovey! 💖
`

exports['midnight-smoker [E2E] built-in checks when a check fails when the rule severity is "off" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/3 checks…
✔ Successfully ran 3 checks
✔ Lovey-dovey! 💖
`
