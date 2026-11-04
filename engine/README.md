# Citizen Sampler engine

The C++ sound engine for the desktop app and plugin. The web app runs the
same rules in TypeScript (`frontend-next/src/lib/engine`). Both sit behind the
same command and event protocol, so the React UI drives either one.

- `core/`: plain C++20 with no dependencies. It covers voices, the FX chain,
  the transport, recording and stem rendering. The host decodes audio and
  hands the core buffers.
- `tests/`: doctest unit tests. Many port the TypeScript tests case for case.
- `juce/`: the JUCE app and plugin. They host the core and show the web UI in
  a WebView.

## Build and test the core

```sh
cmake -S engine -B engine/build -G Ninja
cmake --build engine/build
./engine/build/tests/citizen_core_tests
```

## Build the JUCE app

The app needs JUCE 8. It looks for `~/code/JUCE`, or you can pass `-DJUCE_DIR=...`.

```sh
cmake -S engine -B engine/build-juce -G Ninja -DCITIZEN_BUILD_JUCE=ON
cmake --build engine/build-juce --target CitizenSampler_Standalone
```

In development the WebView loads `http://localhost:3000`, so run
`pnpm dev` in `frontend-next` first. Set `CITIZEN_UI_URL` to use another
address, and `CITIZEN_LOG_BRIDGE=1` to print every command and event.

## Bundle the UI

Release builds carry the web UI inside the binary, served from JUCE's own
origin (`juce://juce.backend` on macOS, `https://juce.backend` on Windows), so
they need no server. Export the UI as static files, then point CMake at them:

```sh
(cd frontend-next && NEXT_OUTPUT=export NEXT_PUBLIC_API_BASE_URL=https://api.citizensampler.com pnpm build)
cmake -S engine -B engine/build-release -G Ninja -DCITIZEN_BUILD_JUCE=ON \
  -DCMAKE_BUILD_TYPE=Release -DCITIZEN_UI_DIR="$PWD/frontend-next/out"
cmake --build engine/build-release
```

`CITIZEN_UI_URL` still overrides the bundled UI, which helps when debugging a
release build against the dev server.

## Release

Desktop releases are cut with `/release`, which runs the `desktop-release`
workflow from `~/code/release-swamp` against `.release.yaml`. The version is
the one in `project(CitizenSamplerEngine VERSION ...)` in
`engine/CMakeLists.txt`, and the tag is `v<version>`.

- You approve once, before anything is pushed.
- This Mac builds, signs and notarizes the Mac installer with
  `scripts/package-mac.sh` (the app, the AU and the VST3 in one `.pkg`).
- The tag push runs `.github/workflows/release-desktop.yml`, which builds and
  signs the Windows installer into a draft release.
- The workflow attaches the Mac `.pkg` to that draft, sets the notes and
  publishes it.

To build the Mac installer by hand, run `scripts/package-mac.sh`. Signing and
notarization run only when their settings are present; the script's header
lists them.
