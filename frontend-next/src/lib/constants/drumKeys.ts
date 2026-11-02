export const drumKeys = [
  "q",
  "w",
  "e",
  "r",
  "a",
  "s",
  "d",
  "f",
  "z",
  "x",
  "c",
  "v",
  "ArrowLeft",
  "ArrowUp",
  "ArrowDown",
  "ArrowRight",
];

const arrowSymbols: Record<string, string> = {
  ArrowLeft: "←",
  ArrowUp: "↑",
  ArrowRight: "→",
  ArrowDown: "↓",
};

// The label shown on a pad for its hotkey
export function getKeySymbol(key: string): string {
  return arrowSymbols[key] ?? key;
}
