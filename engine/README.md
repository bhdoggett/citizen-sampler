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
`pnpm dev` in `frontend-next` first.
