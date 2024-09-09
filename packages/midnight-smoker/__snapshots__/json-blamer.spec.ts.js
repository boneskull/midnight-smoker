exports['midnight-smoker [E2E] JSONBlamer getContext() should return the correct context around the keypath location [snapshot] 1'] = `
— file.json ——————✂
[2m4:[22m   },
[2m5:[22m   [33m"foo"[39m: {
[2m6:[22m     [41m[37m"bar": "baz"[39m[49m
——————————————————✂
`

exports['midnight-smoker [E2E] JSONBlamer getContext() should return a multiline highlighted value [snapshot] 1'] = `
— file.json ———————✂
[2m1:[22m {
[2m2:[22m   [41m[37m"baz": {[39m[49m
[2m3:[22m [41m[37m    "qux": "quux"[39m[49m
[2m4:[22m [41m[37m  },[39m[49m
———————————————————✂
`

exports['midnight-smoker [E2E] JSONBlamer getContext() should return the correct context when the keypath is at the end of the JSON [snapshot] 1'] = `
— file.json ———————✂
[2m1:[22m {
[2m2:[22m   [33m"baz"[39m: {
[2m3:[22m     [41m[37m"qux": "quux"[39m[49m
———————————————————✂
`
