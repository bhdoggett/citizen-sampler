import styles from "./Spinner.module.css";

const Spinner = () => {
  return <div className={styles.spinner} role="status" aria-label="Loading" />;
};

export default Spinner;
