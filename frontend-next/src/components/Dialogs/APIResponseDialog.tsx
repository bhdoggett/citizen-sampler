"use client";
import styles from "./Dialog.module.css";

const APIResponseDialog: React.FC<{ message: string }> = ({ message }) => {
  return <h2 className={styles.message}>{message}</h2>;
};

export default APIResponseDialog;
