#!/bin/zsh

set -euo pipefail

booted_simulator="$(xcrun simctl list devices booted | sed -n 's/^[[:space:]]*\([^()]*\) ([A-F0-9-][A-F0-9-]*) (Booted).*/\1/p' | head -n 1 | sed 's/[[:space:]]*$//')"
booted_simulator_udid="$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -n 1 || true)"

if [[ -z "$booted_simulator" ]]; then
  default_simulator_line="$(xcrun simctl list devices available | awk '/iPhone/ && /(Shutdown|Booted)/ { sub(/^[[:space:]]+/, "", $0); print; exit }')"
  default_simulator_name="$(echo "$default_simulator_line" | cut -d '(' -f 1 | xargs)"
  default_simulator_udid="$(echo "$default_simulator_line" | grep -oE '[A-F0-9-]{36}' | head -n 1 || true)"

  if [[ -n "$default_simulator_udid" ]]; then
    open -a Simulator >/dev/null 2>&1 || true
    xcrun simctl boot "$default_simulator_udid" >/dev/null 2>&1 || true
    xcrun simctl bootstatus "$default_simulator_udid" -b
    booted_simulator="$default_simulator_name"
    booted_simulator_udid="$default_simulator_udid"
  fi
fi

if [[ -z "$booted_simulator" ]]; then
  echo "No booted iOS simulator found" >&2
  exit 1
fi

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

xcodebuild \
  -workspace ios/Inmigreat.xcworkspace \
  -scheme Inmigreat \
  -configuration Debug \
  -destination "platform=iOS Simulator,name=$booted_simulator" \
  -derivedDataPath ios/build \
  build

app_path="ios/build/Build/Products/Debug-iphonesimulator/Inmigreat.app"

if [[ ! -d "$app_path" ]]; then
  echo "Expected app bundle not found at $app_path" >&2
  exit 1
fi

xcrun simctl install "$booted_simulator_udid" "$app_path"
xcrun simctl launch "$booted_simulator_udid" com.changayaf.inmigreat || true