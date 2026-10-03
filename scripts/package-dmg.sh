#!/bin/bash
set -euo pipefail
reader_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$reader_root"
if [[ "${SHIYUE_SKIP_BUILD:-0}" == "1" ]]; then
  /usr/bin/codesign --verify --deep --strict "$reader_root/release/拾页.app"
else
  ./scripts/build-macos.sh
fi
reader_python="${SHIYUE_BUILD_PYTHON:-python3}"
reader_tools="$reader_root/.build/dmg-tools"
if [[ ! -d "$reader_tools/dmgbuild" ]]; then
  "$reader_python" -m pip install --disable-pip-version-check --target "$reader_tools" -r macos/dmg-requirements.txt
fi
reader_release="$reader_root/release"
reader_identity="${SHIYUE_SIGN_IDENTITY:--}"
reader_version="$(node -p "JSON.parse(require('fs').readFileSync('package.json','utf8')).version")"
reader_dmg="$reader_release/拾页-$reader_version-universal.dmg"
if [[ -f "$reader_dmg" ]]; then
  mv "$reader_dmg" "$reader_release/拾页-$reader_version-universal-previous.dmg"
fi
node scripts/release-readme.mjs "$reader_release/安装说明.txt" "$reader_identity"
PYTHONPATH="$reader_tools${PYTHONPATH:+:$PYTHONPATH}" "$reader_python" -m dmgbuild -s macos/dmg-settings.py \
  -D "app=$reader_release/拾页.app" -D "assets=$reader_root/.build/macos/assets" -D "readme=$reader_release/安装说明.txt" -D "version=$reader_version" \
  "拾页 $reader_version" "$reader_dmg"
if [[ "$reader_identity" != "-" ]]; then
  /usr/bin/codesign --force --sign "$reader_identity" --timestamp "$reader_dmg"
fi
reader_notarized=false
if [[ -n "${SHIYUE_NOTARY_PROFILE:-}" ]]; then
  if [[ "$reader_identity" == "-" ]]; then printf 'Apple 公证需要先配置 Developer ID 发布证书。\n' >&2; exit 1; fi
  xcrun notarytool submit "$reader_dmg" --keychain-profile "$SHIYUE_NOTARY_PROFILE" --wait
  xcrun stapler staple "$reader_dmg"
  xcrun stapler validate "$reader_dmg"
  reader_notarized=true
fi
/usr/bin/hdiutil verify "$reader_dmg"
(cd "$reader_release" && /usr/bin/shasum -a 256 "$(basename "$reader_dmg")" > SHA256SUMS.txt)
node scripts/release-manifest.mjs "$reader_dmg" "$reader_identity" "$reader_notarized"
printf '\n已生成 DMG：%s\n' "$reader_dmg"
if [[ "$reader_identity" == "-" ]]; then printf '当前为未公证的本地预览包。正式公开分发需配置 Developer ID 签名和 Apple 公证。\n'; fi
