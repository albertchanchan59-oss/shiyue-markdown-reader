#!/bin/bash
set -euo pipefail
reader_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$reader_root"
reader_mode="${1:-run}"
reader_running="$(pgrep -f "$reader_root/release/拾页.app/Contents/MacOS/拾页" || true)"
if [[ -n "$reader_running" ]]; then kill $reader_running; fi
./scripts/build-macos.sh
reader_app="$reader_root/release/拾页.app"
case "$reader_mode" in
  run) /usr/bin/open -n "$reader_app" ;;
  --verify) /usr/bin/open -n "$reader_app"; sleep 2; pgrep -f "$reader_app/Contents/MacOS/拾页" ;;
  --debug) lldb -- "$reader_app/Contents/MacOS/拾页" ;;
  --logs|--telemetry) /usr/bin/open -n "$reader_app"; /usr/bin/log stream --info --style compact --predicate 'process == "拾页"' ;;
  *) printf '用法：%s [run|--verify|--debug|--logs|--telemetry]\n' "$0" >&2; exit 2 ;;
esac
