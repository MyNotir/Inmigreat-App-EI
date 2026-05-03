#!/bin/zsh

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"

cd "$repo_root"
zsh ./scripts/build-ios-dev-client.sh
zsh ./scripts/build-android-dev-client.sh