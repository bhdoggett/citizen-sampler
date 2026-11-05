// The desktop app's static export sets NEXT_PUBLIC_DESKTOP_APP (see
// next.config.ts). Next inlines it at build time, so each build knows which
// one it is from the first render.
export function isDesktopApp(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_DESKTOP_APP);
}

// Browsers keep Web Audio silent until the user clicks, so the website waits
// behind the Make Beats button. The desktop app and plugins play through the
// C++ engine and need no click.
export function needsAudioUnlock(makeBeatsPressed: boolean): boolean {
  return !isDesktopApp() && !makeBeatsPressed;
}
