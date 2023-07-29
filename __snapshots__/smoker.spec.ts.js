exports['midnight-smoker class Smoker constructor should throw if both non-empty "workspace" and true "all" options are provided 1'] = {
  "stdout": "{\n  \"results\": [\n    {\n      \"pkgName\": \"midnight-smoker\",\n      \"script\": \"smoke\",\n      \"rawResult\": {\n        \"command\": \"<path/to>/bin/npm run-script smoke\",\n        \"escapedCommand\": \"<path/to>/bin/npm\\\" run-script smoke\",\n        \"exitCode\": 0,\n        \"stdout\": \"\\n> midnight-smoker@<version> smoke\\n> <path/to/>smoker.js --version\\n\\n<version>\",\n        \"stderr\": \"\",\n        \"failed\": false,\n        \"timedOut\": false,\n        \"isCanceled\": false,\n        \"killed\": false\n      }\n    }\n  ],\n  \"total\": 1,\n  \"executed\": 1,\n  \"scripts\": [\n    \"smoke\"\n  ]\n}",
  "stderr": "",
  "exitCode": 0
}
