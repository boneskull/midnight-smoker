exports['midnight-smoker [E2E] custom scripts single script when the script succeeds should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
`

exports['midnight-smoker [E2E] custom scripts single script when the script fails should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✖ 1 of 1 script failed
⚠ Script execution failure details for package fail:
- Script smoke in package fail failed with exit code 1 (ESMOKER_RUNSCRIPT)

✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] custom scripts multiple scripts when the scripts succeed should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/2…
✔ Successfully ran 2 scripts
✔ Lovey-dovey! 💖
`
