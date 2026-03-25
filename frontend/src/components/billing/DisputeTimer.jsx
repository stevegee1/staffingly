import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function DisputeTimer({ closesAt }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(closesAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [closesAt]);

  return (
    <span className="flex items-center gap-1 text-amber-700 font-semibold text-xs">
      <Clock className="w-3.5 h-3.5" />
      {remaining}
    </span>
  );
}
