#!/usr/bin/env bash
# Builds the macOS installer: one universal .pkg that installs the app into
# /Applications and the AU and VST3 plugins into /Library/Audio/Plug-Ins, each
# a checkbox in the installer.
#
# Signing and notarization run when their settings are present; without them
# the .pkg is unsigned, fine for testing on this machine only.
#   MAC_SIGN_IDENTITY       "Developer ID Application: Doggett Systems LLC (9B9573H63M)"
#   MAC_INSTALLER_IDENTITY  "Developer ID Installer: Doggett Systems LLC (9B9573H63M)"
# Notarization takes either a notarytool keychain profile (local) or an App
# Store Connect API key (CI):
#   NOTARY_PROFILE          name given to `xcrun notarytool store-credentials`
#   APPLE_API_KEY_PATH, APPLE_API_KEY, APPLE_API_ISSUER
#
# Other settings:
#   JUCE_DIR      JUCE 8 checkout (default ~/code/JUCE)
#   API_BASE_URL  backend the bundled UI talks to (default production)
#   SKIP_UI=1     reuse frontend-next/out instead of exporting again
#
# Output: dist/Citizen-Sampler-<version>-mac.pkg
set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
build="$root/engine/build-mac-release"
dist="$root/dist"
stage="$build/pkg"
version=$(sed -nE 's/^project\(CitizenSamplerEngine VERSION ([0-9.]+).*/\1/p' "$root/engine/CMakeLists.txt")
bundle_id=com.doggettsystems.citizensampler
artefacts="$build/juce/CitizenSampler_artefacts/Release"
pkg="$dist/Citizen-Sampler-$version-mac.pkg"

echo "==> Citizen Sampler $version"

if [[ "${SKIP_UI:-}" != 1 ]]; then
  echo "==> Exporting the web UI"
  (cd "$root/frontend-next" &&
    NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL="${API_BASE_URL:-https://api.citizensampler.com}" \
      pnpm build)
fi

echo "==> Building the app and plugins (universal)"
cmake -S "$root/engine" -B "$build" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" \
  -DCITIZEN_BUILD_JUCE=ON -DCITIZEN_BUILD_TESTS=OFF \
  -DCITIZEN_UI_DIR="$root/frontend-next/out" \
  ${JUCE_DIR:+-DJUCE_DIR="$JUCE_DIR"}
cmake --build "$build" --target CitizenSampler_Standalone CitizenSampler_AU CitizenSampler_VST3

app="$artefacts/Standalone/Citizen Sampler.app"
au="$artefacts/AU/Citizen Sampler.component"
vst3="$artefacts/VST3/Citizen Sampler.vst3"

if [[ -n "${MAC_SIGN_IDENTITY:-}" ]]; then
  echo "==> Signing the app and plugins"
  for bundle in "$app" "$au" "$vst3"; do
    codesign --force --options runtime --timestamp --sign "$MAC_SIGN_IDENTITY" "$bundle"
    codesign --verify --strict "$bundle"
  done
else
  echo "warning: MAC_SIGN_IDENTITY not set, the app and plugins are unsigned" >&2
fi

echo "==> Packaging"
rm -rf "$stage" && mkdir -p "$stage" "$dist"
# One component package per format. Bundles are not relocatable, so the
# installer always writes to the standard folder rather than chasing a copy
# it finds elsewhere on disk.
component() { # name, bundle, install location
  local dir="$stage/root-$1" plist="$stage/$1.plist"
  mkdir -p "$dir"
  cp -R "$2" "$dir/"
  pkgbuild --analyze --root "$dir" "$plist" >/dev/null
  plutil -replace 0.BundleIsRelocatable -bool NO "$plist"
  pkgbuild --root "$dir" --component-plist "$plist" --install-location "$3" \
    --identifier "$bundle_id.$1" --version "$version" "$stage/$1.pkg" >/dev/null
}
component app "$app" /Applications
component au "$au" /Library/Audio/Plug-Ins/Components
component vst3 "$vst3" /Library/Audio/Plug-Ins/VST3

cat > "$stage/distribution.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="2">
  <title>Citizen Sampler $version</title>
  <options customize="always" require-scripts="false" hostArchitectures="arm64,x86_64"/>
  <domains enable_localSystem="true"/>
  <os-version min="11.0"/>
  <choices-outline>
    <line choice="app"/>
    <line choice="au"/>
    <line choice="vst3"/>
  </choices-outline>
  <choice id="app" title="Standalone app" description="Citizen Sampler in your Applications folder.">
    <pkg-ref id="$bundle_id.app"/>
  </choice>
  <choice id="au" title="Audio Unit plugin" description="For Logic Pro, GarageBand, Ableton Live and other AU hosts.">
    <pkg-ref id="$bundle_id.au"/>
  </choice>
  <choice id="vst3" title="VST3 plugin" description="For Ableton Live, Cubase, Bitwig, Reaper and other VST3 hosts.">
    <pkg-ref id="$bundle_id.vst3"/>
  </choice>
  <pkg-ref id="$bundle_id.app" version="$version">app.pkg</pkg-ref>
  <pkg-ref id="$bundle_id.au" version="$version">au.pkg</pkg-ref>
  <pkg-ref id="$bundle_id.vst3" version="$version">vst3.pkg</pkg-ref>
</installer-gui-script>
EOF

sign_args=()
if [[ -n "${MAC_INSTALLER_IDENTITY:-}" ]]; then
  sign_args=(--sign "$MAC_INSTALLER_IDENTITY" --timestamp)
else
  echo "warning: MAC_INSTALLER_IDENTITY not set, the installer is unsigned" >&2
fi
productbuild --distribution "$stage/distribution.xml" --package-path "$stage" \
  ${sign_args[@]+"${sign_args[@]}"} "$pkg"

notary_args=()
if [[ -n "${NOTARY_PROFILE:-}" ]]; then
  notary_args=(--keychain-profile "$NOTARY_PROFILE")
elif [[ -n "${APPLE_API_KEY_PATH:-}" ]]; then
  notary_args=(--key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER")
fi
if [[ ${#notary_args[@]} -gt 0 && ${#sign_args[@]} -gt 0 ]]; then
  echo "==> Notarizing (takes a few minutes)"
  xcrun notarytool submit "$pkg" "${notary_args[@]}" --wait
  xcrun stapler staple "$pkg"
  spctl --assess --type install --verbose "$pkg"
else
  echo "warning: not notarized; other Macs will refuse to open it" >&2
fi

echo "==> $pkg"
