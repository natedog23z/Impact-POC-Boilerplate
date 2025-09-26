"use client";

import React from "react";

export type DonutSegment = {
  value: number; // 0..1 fraction of whole
  color: string;
  label?: string;
};

export type DonutChartProps = {
  size?: number; // px
  thickness?: number; // stroke width px
  segments: DonutSegment[]; // expected to sum to ~1 (we normalize defensively)
};

export default function DonutChart({ size = 140, thickness = 18, segments }: DonutChartProps) {
  const clamped = segments.map((s) => ({ ...s, value: Math.max(0, s.value) }));
  const total = clamped.reduce((acc, s) => acc + s.value, 0) || 1;
  const normalized = clamped.map((s) => ({ ...s, value: s.value / total }));

  const center = size / 2;
  // subtract small margin so rounded caps never clip the SVG edges
  const radius = center - thickness / 2 - 2;
  const twoPi = Math.PI * 2;

  let start = -Math.PI / 2; // start at 12 o'clock

  const paths = normalized.map((seg, idx) => {
    const angle = seg.value * twoPi;
    const end = start + angle;

    // If segment is ~0, skip drawing to avoid artifacts
    if (angle <= 0.0001) {
      return null;
    }

    const largeArc = angle > Math.PI ? 1 : 0;
    const startX = center + radius * Math.cos(start);
    const startY = center + radius * Math.sin(start);
    const endX = center + radius * Math.cos(end);
    const endY = center + radius * Math.sin(end);

    const d = [
      `M ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
    ].join(" ");

    // advance start for next segment
    start = end;

    return (
      <path
        key={idx}
        d={d}
        stroke={seg.color}
        strokeWidth={thickness}
        strokeLinecap="round"
        fill="none"
      />
    );
  });

  // background ring
  const bg = (
    <circle
      cx={center}
      cy={center}
      r={radius}
      stroke="#E5E7EB" // gray-200
      strokeWidth={thickness}
      fill="none"
    />
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {bg}
      {paths}
    </svg>
  );
}
