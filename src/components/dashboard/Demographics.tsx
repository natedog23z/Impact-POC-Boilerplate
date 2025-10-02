"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";
import DonutChart, { type DonutSegment } from "./DonutChart";

export type AgeBucket = {
  label: string;
  count: number;
};

export type GenderCounts = Record<string, number>;

export type DemographicsProps = {
  ages: AgeBucket[];
  genders: GenderCounts;
  total: number;
};

export default function Demographics({ ages, genders, total }: DemographicsProps) {
  return (
    <Flex gap="4" align="stretch" wrap="wrap">
      <Box style={{ flex: 1, minWidth: 420 }}>
        <AgeRangeCard ages={ages} />
      </Box>
      <Box style={{ flex: 1, minWidth: 360 }}>
        <GenderCard genders={genders} total={total} />
      </Box>
    </Flex>
  );
}

function AgeRangeCard({ ages }: { ages: AgeBucket[] }) {
  const max = Math.max(1, ...ages.map((a) => a.count));
  return (
    <BorderedCard style={{ padding: 16 }}>
      <Heading size="5" style={{ marginBottom: 12 }}>Age Range</Heading>
      <BarChart data={ages} max={max} />
    </BorderedCard>
  );
}

function BarChart({ data, max, height = 240 }: { data: AgeBucket[]; max: number; height?: number }) {
  const barWidth = 36;
  const gap = 16;
  const leftAxis = 42; // space for y labels
  const paddingRight = 20;
  const paddingTop = 16;
  const paddingBottom = 40; // space for x labels
  const width = leftAxis + paddingRight + data.length * barWidth + (data.length - 1) * gap;
  const chartHeight = height - paddingTop - paddingBottom;

  // Round the max up to a nice tick (nearest 5)
  const niceMax = Math.max(5, Math.ceil(max / 5) * 5);
  const ticks = 5;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Age distribution bar chart">
      <defs>
        <linearGradient id="ageBarGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="100%" stopColor="#A7F3D0" />
        </linearGradient>
      </defs>

      {/* Grid + y-axis labels */}
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const value = Math.round((niceMax * (ticks - i)) / ticks);
        const y = paddingTop + (chartHeight * i) / ticks;
        return (
          <g key={i}>
            <text x={leftAxis - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#6B7280">
              {value}
            </text>
            <line x1={leftAxis} x2={width - paddingRight} y1={y} y2={y} stroke="#E5E7EB" strokeWidth={1} />
          </g>
        );
      })}

      {/* Bars + x labels + value labels */}
      {data.map((d, idx) => {
        const x = leftAxis + idx * (barWidth + gap);
        const h = niceMax === 0 ? 0 : Math.round((d.count / niceMax) * chartHeight);
        const y = paddingTop + chartHeight - h;
        return (
          <g key={idx}>
            <rect x={x} y={y} width={barWidth} height={h} rx={8} fill="url(#ageBarGradient)" />
            {/* value label */}
            {h > 0 ? (
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={12} fill="#111827" fontWeight={600}>
                {d.count}
              </text>
            ) : null}
            {/* x label */}
            <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" fontSize={12} fill="#374151">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GenderCard({ genders, total }: { genders: GenderCounts; total: number }) {
  const colorMap: Record<string, string> = {
    Female: "#10B981", // emerald-500
    Male: "#059669",   // emerald-600
    "Non-binary": "#34D399", // emerald-400
    "Prefer not to say": "#A7F3D0", // emerald-200
    "Other/Unknown": "#E5E7EB",
  };

  const entries = Object.entries(genders).sort((a, b) => b[1] - a[1]);
  const sum = entries.reduce((acc, [, c]) => acc + c, 0) || 1;
  const segments: DonutSegment[] = entries.map(([label, count]) => ({
    value: count / sum,
    color: colorMap[label] ?? "#D1D5DB",
    label,
  }));

  return (
    <BorderedCard style={{ padding: 16 }}>
      <Heading size="5" style={{ marginBottom: 12 }}>Gender</Heading>
      <Flex align="center" gap="5" wrap="wrap">
        <Box style={{ position: "relative", width: 180, height: 180 }}>
          <DonutChart size={180} thickness={28} segments={segments} />
          <Box style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1, pointerEvents: "none" }}>
            <Box style={{ textAlign: "center" }}>
              <Text as="div" size="7" weight="bold" style={{ lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>{total}</Text>
              <Text as="div" size="2" color="gray" style={{ marginTop: 2 }}>Participants</Text>
            </Box>
          </Box>
        </Box>
        <Box>
          {entries.map(([label, count], i) => (
            <LegendItem key={i} color={colorMap[label] ?? "#D1D5DB"} label={label} count={count} total={total} />
          ))}
        </Box>
      </Flex>
    </BorderedCard>
  );
}

function LegendItem({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <Flex align="center" gap="3" style={{ marginBottom: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color, display: "inline-block" }} />
      <Text><Text weight="bold">{pct}%</Text> {label}</Text>
    </Flex>
  );
}


