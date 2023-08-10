#!/bin/bash

# This script dumps historical version and dist-tag data for npm, yarn, and pnpm
# into the "data" dir

DATA_DIR="$(dirname ${BASH_SOURCE[0]})/../data"

for pm in npm yarn pnpm; do
  echo "Updating ${pm} versions..."
  npm info --json ${pm} versions >"${DATA_DIR}/${pm}-versions.json"
  npm info --json ${pm} dist-tags >"${DATA_DIR}/${pm}-dist-tags.json"
done

curl -s https://repo.yarnpkg.com/tags >"${DATA_DIR}/yarn-tags.json"

echo "Done!"
