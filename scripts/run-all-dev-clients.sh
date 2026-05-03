#!/bin/zsh

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
port="${DEV_CLIENT_PORT:-8081}"
log_dir="$repo_root/.expo"
log_file="$log_dir/dev-client-metro.log"
pid_file="$log_dir/dev-client-metro.pid"

if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "Reusing existing dev-client Metro on port $port"
	cd "$repo_root"
	zsh ./scripts/start-ios-dev-client.sh
	zsh ./scripts/start-android-dev-client.sh
	exit 0
fi

mkdir -p "$log_dir"

cd "$repo_root"
nohup zsh ./scripts/start-dev-client-metro.sh > "$log_file" 2>&1 &
metro_pid=$!
echo "$metro_pid" > "$pid_file"
disown "$metro_pid" >/dev/null 2>&1 || true

for _ in {1..60}; do
	if lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
		break
	fi
	sleep 1
done

if ! lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
	echo "Metro dev-client did not start on port $port" >&2
	echo "Check log: $log_file" >&2
	exit 1
fi

zsh ./scripts/start-ios-dev-client.sh
zsh ./scripts/start-android-dev-client.sh

echo "Dev-client Metro running on port $port"
echo "Metro log: $log_file"