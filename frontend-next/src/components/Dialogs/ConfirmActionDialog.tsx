"use client";
import { useUIContext } from "../../app/contexts/UIContext";
import styles from "./Dialog.module.css";

const ConfirmActionDialog: React.FC = () => {
  const { setShowDialog, confirmActionRef, setHotKeysActive } = useUIContext();

  if (!confirmActionRef.current) return null;

  return (
    <>
      <h2 className={styles.message}>
        {confirmActionRef.current.message}
      </h2>
      <button
        type="button"
        onClick={() => {
          if (!confirmActionRef.current) return;
          confirmActionRef.current.action();
          setShowDialog(null);
          setHotKeysActive(true);
        }}
        className={`${styles.button} ${styles.primary}`}
      >
        {confirmActionRef.current.buttonText}
      </button>
    </>
  );
};

export default ConfirmActionDialog;
