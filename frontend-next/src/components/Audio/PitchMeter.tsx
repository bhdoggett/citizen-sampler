type PitchResult = { note: string; cents: number } | null;

const PitchMeter = ({ pitch }: { pitch: PitchResult }) => {
  const cx = 28,
    cy = 28,
    r = 22;

  const cents = pitch?.cents ?? 0;
  const note = pitch?.note ?? "—";
  const clamped = Math.max(-50, Math.min(50, cents));
  // 0 ¢ = 12 o'clock (0°), −50 ¢ = 9 o'clock (−90°), +50 ¢ = 3 o'clock (+90°)
  const rotationDeg = (clamped / 50) * 90;

  const color =
    Math.abs(cents) <= 5
      ? "#22c55e"
      : Math.abs(cents) <= 20
        ? "#eab308"
        : "#ef4444";
  const active = !!pitch;

  // Highlight arc: 30° wide, centered at 12 o'clock before rotation
  const delta = Math.PI / 12; // 15°
  const hx1 = cx + r * Math.sin(-delta);
  const hy1 = cy - r * Math.cos(-delta);
  const hx2 = cx + r * Math.sin(delta);
  const hy2 = cy - r * Math.cos(delta);

  return (
    <svg width="30" height="30" viewBox="0 0 56 56" className="shrink-0">
      {/* Full circle outline */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="2.5"
      />
      {/* Rotating highlight arc — sweep-flag=1 (CW) follows the outer circle */}
      <path
        d={`M ${hx1} ${hy1} A ${r} ${r} 0 0 1 ${hx2} ${hy2}`}
        fill="none"
        stroke={active ? color : "#d1d5db"}
        strokeWidth="4"
        strokeLinecap="round"
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: `rotate(${rotationDeg}deg)`,
          transition: "transform 80ms ease-out, stroke 80ms ease-out",
        }}
      />
      {/* Note name */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="20"
        fontFamily="monospace"
        fontWeight="bold"
        fill={active ? "#111827" : "#9ca3af"}
      >
        {note}
      </text>
    </svg>
  );
};

export default PitchMeter;
