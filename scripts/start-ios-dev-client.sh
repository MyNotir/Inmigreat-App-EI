#!/bin/zsh

set -euo pipefail

booted_simulator="$(xcrun simctl list devices booted | sed -n 's/^[[:space:]]*\([^()]*\) ([A-F0-9-][A-F0-9-]*) (Booted).*/\1/p' | head -n 1 | sed 's/[[:space:]]*$//')"
booted_simulator_udid="$(xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -n 1 || true)"

if [[ -z "$booted_simulator" ]]; then
	default_simulator_line="$(xcrun simctl list devices available | awk '/iPhone/ && /(Shutdown|Booted)/ { sub(/^[[:space:]]+/, "", $0); print; exit }')"
	default_simulator_udid="$(echo "$default_simulator_line" | grep -oE '[A-F0-9-]{36}' | head -n 1 || true)"

	if [[ -n "$default_simulator_udid" ]]; then
		open -a Simulator >/dev/null 2>&1 || true
		xcrun simctl boot "$default_simulator_udid" >/dev/null 2>&1 || true
		xcrun simctl bootstatus "$default_simulator_udid" -b
		booted_simulator_udid="$default_simulator_udid"
	fi
fi

if [[ -z "$booted_simulator_udid" ]]; then
	echo "No booted iOS simulator found" >&2
	exit 1
fi

if ! xcrun simctl get_app_container "$booted_simulator_udid" com.changayaf.inmigreat app >/dev/null 2>&1; then
	echo "iOS development build is not installed. Run npm run ios:build:local first." >&2
	exit 1
fi

dev_client_host="${DEV_CLIENT_HOST:-$(node -e 'const os=require("os"); for (const list of Object.values(os.networkInterfaces())) { for (const net of list || []) { if (net && net.family === "IPv4" && !net.internal) { console.log(net.address); process.exit(0); } } } process.exit(1);')}"
dev_client_port="${DEV_CLIENT_PORT:-8081}"
dev_client_url="http://${dev_client_host}:${dev_client_port}"
deeplink="$(node -e 'process.stdout.write(`exp+inmigreat://expo-development-client/?url=${encodeURIComponent(process.argv[1])}`)' "$dev_client_url")"

export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

xcrun simctl openurl "$booted_simulator_udid" "$deeplink"