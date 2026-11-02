"use client";
import { useUIContext } from "../../app/contexts/UIContext";
import styles from "./Dialog.module.css";

type ConfirmActionDialogProps = {
  message: string;
  buttonText: string;
  onConfirm: () => void;
};

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  message,
  buttonText,
  onConfirm,
}) => {
  const { closeDialog, setHotKeysActive } = useUIContext();

  return (
    <>
      <h2 className={styles.message}>{message}</h2>
      <button
        type="button"
        onClick={() => {
          onConfirm();
          closeDialog();
          setHotKeysActive(true);
        }}
        className={`${styles.button} ${styles.primary}`}
      >
        {buttonText}
      </button>
    </>
  );
};

export default ConfirmActionDialog;
