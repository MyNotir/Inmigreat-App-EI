#!/bin/zsh

set -euo pipefail

port="${DEV_CLIENT_PORT:-8081}"

npx expo start --dev-client --port "$port"