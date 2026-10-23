"use client";
import { useUIContext } from "src/app/contexts/UIContext";
import styles from "./Dialog.module.css";

const APIResponseDialog: React.FC = () => {
  const { apiResponseMessageRef } = useUIContext();

  return (
    <h2 className={styles.message}>{apiResponseMessageRef.current}</h2>
  );
};

export default APIResponseDialog;
