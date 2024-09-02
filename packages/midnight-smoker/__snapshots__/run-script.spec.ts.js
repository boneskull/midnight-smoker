exports['midnight-smoker [E2E] custom scripts single script when the script succeeds should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: 'run' one (1) script in single-script using npm@<version> (system)

Smokin'…
Lovey-dovey!
`

exports['midnight-smoker [E2E] custom scripts single script when the script fails should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: 'run' one (1) script in fail using npm@<version> (system)

Smokin'…
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]
`

exports['midnight-smoker [E2E] custom scripts multiple scripts when the scripts succeed should produce expected output [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: 'run' two (2) scripts in single-script using npm@<version> (system)

Smokin'…
Lovey-dovey!
`
