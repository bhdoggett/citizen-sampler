import { hasJuceBackend } from "src/lib/engine/juce/juceBridgeEngine";

// The desktop app's static export sets NEXT_PUBLIC_DESKTOP_APP (see
// next.config.ts). Next inlines it at build time, so each build knows which
// one it is from the first render. JUCE builds that load the dev server have
// no flag, so the injected JUCE backend also counts.
export function isDesktopApp(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_DESKTOP_APP) || hasJuceBackend();
}

// Browsers keep Web Audio silent until the user clicks, so the website waits
// behind the Make Beats button. The desktop app and plugins play through the
// C++ engine and need no click.
export function needsAudioUnlock(makeBeatsPressed: boolean): boolean {
  return !isDesktopApp() && !makeBeatsPressed;
}
