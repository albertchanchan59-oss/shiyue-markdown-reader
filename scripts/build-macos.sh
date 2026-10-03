#!/bin/bash
set -euo pipefail
reader_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$reader_root"
reader_build="$reader_root/.build/macos"
reader_release="$reader_root/release"
reader_app="$reader_release/拾页.app"
reader_identity="${SHIYUE_SIGN_IDENTITY:--}"
mkdir -p "$reader_build/assets" "$reader_release"
npm run build
xcrun swiftc -sdk "$(xcrun --show-sdk-path)" -module-cache-path "$reader_build/module-cache" macos/GenerateAssets.swift -o "$reader_build/generate-assets"
"$reader_build/generate-assets" "$reader_build/assets"
/usr/bin/sips -z 560 640 "$reader_build/assets/installer-background@2x.png" --out "$reader_build/assets/installer-background.png" >/dev/null
/usr/bin/iconutil -c icns "$reader_build/assets/AppIcon.iconset" -o "$reader_build/assets/AppIcon.icns"
node scripts/licenses.mjs "$reader_build/ThirdPartyNotices.txt"
reader_entitlements="macos/electron-entitlements.plist"
if [[ "$reader_identity" == "-" ]]; then reader_entitlements="macos/electron-adhoc-entitlements.plist"; fi
npx --no-install electron-builder --config macos/electron-builder.yml --mac dir --universal "-c.mac.identity=$reader_identity" "-c.mac.entitlements=$reader_entitlements" "-c.mac.entitlementsInherit=$reader_entitlements"
if [[ -d "$reader_app" ]]; then rm -rf "$reader_app"; fi
/usr/bin/ditto "$reader_root/.build/electron/mac-universal/拾页.app" "$reader_app"
/usr/bin/codesign --verify --deep --strict --verbose=2 "$reader_app"
/usr/bin/lipo -archs "$reader_app/Contents/MacOS/拾页"
/usr/bin/plutil -lint "$reader_app/Contents/Info.plist"
printf '已生成：%s\n' "$reader_app"
