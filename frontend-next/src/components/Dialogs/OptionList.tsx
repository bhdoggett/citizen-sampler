"use client";
import styles from "./OptionList.module.css";

type OptionListProps = {
  name: string;
  label: string;
  items: string[];
  selectedIndex: number | null;
  onSelect: (index: number, item: string) => void;
  getLabel?: (item: string) => string;
  onBlur?: () => void;
};

// Always-open single-choice list. Native radios underneath give arrow-key
// navigation and screen reader semantics for free.
const OptionList: React.FC<OptionListProps> = ({
  name,
  label,
  items,
  selectedIndex,
  onSelect,
  getLabel = (item) => item,
  onBlur,
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={styles.list}
  >
    {items.map((item, index) => (
      <label
        key={`${item}-${index}`}
        className={`${styles.option} ${
          selectedIndex === index ? styles.optionSelected : ""
        }`}
      >
        <input
          name={name}
          type="radio"
          className={styles.radio}
          value={item}
          checked={selectedIndex === index}
          onChange={() => onSelect(index, item)}
          onBlur={onBlur}
        />
        {getLabel(item)}
      </label>
    ))}
  </div>
);

export default OptionList;
