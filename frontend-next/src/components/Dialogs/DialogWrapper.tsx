"use client";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./DialogWrapper.module.css";

type DialogWrapperProps = {
  children: React.ReactNode;
};
const DialogWrapper: React.FC<DialogWrapperProps> = ({ children }) => {
  const { setShowDialog, setHotKeysActive } = useUIContext();
  // const [loginError, setLoginError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const loginError = searchParams.get("loginError");

  const handleCloseDialog = () => {
    {
      if (loginError) {
        router.push("/");
      }
      setHotKeysActive(true);
      setShowDialog(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        handleCloseDialog();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} />
      <div ref={dialogRef} className={styles.dialog}>
        <div className={styles.bar}>
          <button
            type="button"
            onClick={handleCloseDialog}
            className={styles.close}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
};

export default DialogWrapper;
