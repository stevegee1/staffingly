export default function ConfidenceGauge({ score, size = "sm" }) {
  const color = score >= 85 ? "#16a34a" : score >= 70 ? "#d97706" : "#dc2626";
  const isLarge = size === "lg";

  if (isLarge) {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>
              {score}%
            </span>
            <span className="text-xs text-slate-400">confidence</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span className="text-xs font-bold" style={{ color }}>
      {score}%
    </span>
  );
}
