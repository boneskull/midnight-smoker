exports['midnight-smoker [E2E] custom scripts single script when the script succeeds should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/1 scripts…
✔ Successfully ran one (1) script
✔ Lovey-dovey! 💖
`

exports['midnight-smoker [E2E] custom scripts single script when the script fails should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/1 scripts…
✖ 1 of 1 script failed
⚠ Script execution failure details for package fail:
- Script smoke in package fail failed with exit code 1 (ESMOKER_RUNSCRIPT)

✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] custom scripts multiple scripts when the scripts succeed should produce expected output [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✔ Installed one (1) package from tarball using npm@<version>
- Running 0/2 scripts…
✔ Successfully ran two (2) scripts
✔ Lovey-dovey! 💖
`
