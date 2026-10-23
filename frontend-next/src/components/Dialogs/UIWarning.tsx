"use client";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";

const UIWarning: React.FC = () => {
  const { uiWarningMessageRef } = useUIContext();

  return (
    <h2 className={styles.message}>{uiWarningMessageRef.current}</h2>
  );
};

export default UIWarning;
