#!/usr/bin/env bash
# Renders all required PWA bitmap assets from the SVG sources in
# frontend/public/. Output lands in frontend/public/pwa/ which is then
# referenced by the manifest + index.html.
#
# Requires `rsvg-convert` (librsvg). Installed via Homebrew on macOS:
#     brew install librsvg
#
# Re-run whenever icon-source.svg or splash-template{,-dark}.svg change.

set -euo pipefail

PUBLIC="$(cd "$(dirname "$0")/.." && pwd)/public"
ICON_SRC="$PUBLIC/icon-source.svg"
SPLASH_LIGHT="$PUBLIC/splash-template.svg"
SPLASH_DARK="$PUBLIC/splash-template-dark.svg"
OUT="$PUBLIC/pwa"

mkdir -p "$OUT"

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "rsvg-convert not found. Install with: brew install librsvg" >&2
  exit 1
fi

render() {
  local src="$1" w="$2" h="$3" out="$4"
  rsvg-convert -w "$w" -h "$h" -a "$src" -o "$out"
  printf "  %5dx%-5d %s\n" "$w" "$h" "${out#$PUBLIC/}"
}

echo "Icons →"
# Manifest icons (Android, Chrome install UI)
render "$ICON_SRC" 192  192  "$OUT/icon-192.png"
render "$ICON_SRC" 512  512  "$OUT/icon-512.png"
# Maskable variant — same source (it's full-bleed by design).
render "$ICON_SRC" 512  512  "$OUT/icon-512-maskable.png"
# Apple touch icon — iOS home-screen
render "$ICON_SRC" 180  180  "$OUT/apple-touch-icon.png"
# Apple touch icon precomposed (older iOS)
render "$ICON_SRC" 167  167  "$OUT/apple-touch-icon-167.png"
render "$ICON_SRC" 152  152  "$OUT/apple-touch-icon-152.png"
render "$ICON_SRC" 120  120  "$OUT/apple-touch-icon-120.png"
# Favicon ICO fallback (single PNG; modern browsers pick SVG anyway)
render "$ICON_SRC"  32   32  "$OUT/favicon-32.png"
render "$ICON_SRC"  16   16  "$OUT/favicon-16.png"

# Apple splash screens — top device sizes by share. Generated as
# `apple-splash-{w}x{h}.png` so the index.html link list can be terse.
# Both portrait + landscape per device.

iphone_splashes() {
  local src="$1" tag="$2"
  echo "Splash ($tag) →"
  # Format: width height
  while IFS=' ' read -r W H; do
    [ -z "${W:-}" ] && continue
    render "$src" "$W" "$H" "$OUT/apple-splash-${W}x${H}-${tag}.png"
    render "$src" "$H" "$W" "$OUT/apple-splash-${H}x${W}-${tag}.png" # landscape
  done <<EOF
1290 2796
1179 2556
1284 2778
1170 2532
1080 2340
828 1792
1125 2436
750 1334
640 1136
EOF
}

iphone_splashes "$SPLASH_LIGHT" light
iphone_splashes "$SPLASH_DARK"  dark

echo
echo "Done. Output in $OUT"
