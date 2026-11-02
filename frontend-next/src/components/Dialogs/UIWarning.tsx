"use client";
import styles from "./Dialog.module.css";

const UIWarning: React.FC<{ message: string }> = ({ message }) => {
  return <h2 className={styles.message}>{message}</h2>;
};

export default UIWarning;
