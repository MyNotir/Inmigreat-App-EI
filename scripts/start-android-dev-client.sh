#!/bin/zsh

set -euo pipefail

export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
log_dir="$repo_root/.expo"
emulator_log="$log_dir/android-emulator.log"

device_id="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"

if [[ -z "$device_id" ]]; then
	mkdir -p "$log_dir"
	avd_name="$(emulator -list-avds | head -n 1 || true)"

	if [[ -z "$avd_name" ]]; then
		echo "No Android emulator/device connected and no AVD is configured." >&2
		exit 1
	fi

	if ! pgrep -f "emulator.*-avd $avd_name" >/dev/null 2>&1; then
		nohup emulator -avd "$avd_name" > "$emulator_log" 2>&1 &
	fi

	adb wait-for-device

	for _ in {1..120}; do
		boot_completed="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
		if [[ "$boot_completed" == "1" ]]; then
			break
		fi
		sleep 2
	done

	device_id="$(adb devices | awk 'NR > 1 && $2 == "device" { print $1; exit }')"

	if [[ -z "$device_id" ]]; then
		echo "Android emulator did not finish booting. Check log: $emulator_log" >&2
		exit 1
	fi
fi

if ! adb shell pm list packages | grep -q 'com.changayaf.inmigreat'; then
	echo "Android development build is not installed. Run npm run android:build:local first." >&2
	exit 1
fi

dev_client_host="${DEV_CLIENT_HOST:-$(node -e 'const os=require("os"); for (const list of Object.values(os.networkInterfaces())) { for (const net of list || []) { if (net && net.family === "IPv4" && !net.internal) { console.log(net.address); process.exit(0); } } } process.exit(1);')}"
dev_client_port="${DEV_CLIENT_PORT:-8081}"
dev_client_url="http://${dev_client_host}:${dev_client_port}"
deeplink="$(node -e 'process.stdout.write(`exp+inmigreat://expo-development-client/?url=${encodeURIComponent(process.argv[1])}`)' "$dev_client_url")"

adb -s "$device_id" shell am start -W -a android.intent.action.VIEW -d "$deeplink" com.changayaf.inmigreat