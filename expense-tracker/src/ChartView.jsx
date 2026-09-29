import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

// Thin wrapper that creates a Chart.js chart on a canvas and cleans it up on change/unmount.
export default function ChartView({ type, data, options, label }) {
  const canvas = useRef(null);
  useEffect(() => {
    Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue("--mut").trim() || "#666";
    const chart = new Chart(canvas.current, {
      type,
      data,
      options: { responsive: true, maintainAspectRatio: false, ...options },
    });
    return () => chart.destroy();
  }, [type, data, options]);
  return (
    <div className="chart">
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
