"use client";
import { useEffect } from "react";
import { useAuthContext } from "../../app/contexts/AuthContext";
import styles from "./Dialog.module.css";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const AuthDialog: React.FC = () => {
  const { setError } = useAuthContext();

  // Set error to null when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return (
    <div className={styles.form}>
      <h2 className={styles.title}>Login</h2>
      <a
        href={`${API_BASE_URL}/auth/google`}
        className={`${styles.button} ${styles.primary}`}
      >
        Continue with Google
      </a>
    </div>
  );
};

export default AuthDialog;
