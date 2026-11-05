import styles from "./DesktopDownload.module.css";

export const RELEASES_URL =
  "https://github.com/bhdoggett/citizen-sampler/releases/latest";

// Points website visitors at the desktop app and plugins. The desktop app's
// own build sets NEXT_PUBLIC_DESKTOP_APP (see next.config.ts), so the link
// never shows inside the app.
const DesktopDownload: React.FC = () => {
  if (process.env.NEXT_PUBLIC_DESKTOP_APP) return null;
  return (
    <a
      className={styles.download}
      href={RELEASES_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Download the desktop app and AU/VST3 plugins for Mac and Windows"
    >
      Desktop + plugins
    </a>
  );
};

export default DesktopDownload;
