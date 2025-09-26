"use client";

import React from "react";
import { Box, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import DonutChart, { type DonutSegment } from "./DonutChart";
import BorderedCard from "@/components/BorderedCard";

export type ImprovementBreakdown = {
  significant: number; // 0..1
  some: number; // 0..1
  none: number; // 0..1
};

export type ImprovementDonutCardProps = {
  headingPercent: number; // 0..1 overall improved (significant + some)
  nCompleted: number; // sessions used for calc
  breakdown: ImprovementBreakdown; // distribution
};

export default function ImprovementDonutCard({ headingPercent, nCompleted, breakdown }: ImprovementDonutCardProps) {
  const segments: DonutSegment[] = [
    { value: breakdown.significant, color: "#059669" }, // emerald-600
    { value: breakdown.some, color: "#34D399" }, // emerald-400
    { value: breakdown.none, color: "#D1D5DB" }, // gray-300
  ];

  const pct = Math.round((headingPercent || 0) * 100);

  return (
    <BorderedCard
      style={{
        padding: 24,
        minHeight: 220,
        boxSizing: "border-box",
      }}
    >
      <Flex gap="4" align="center">
        <DonutChart size={140} thickness={24} segments={segments} />
        <Box>
          <Heading size="6">{pct}% of participants experienced improvement</Heading>
          <Text color="gray" size="2" style={{ display: "block", marginTop: 6 }}>
            Based on {nCompleted} Completed Sessions
          </Text>

          <Separator style={{ marginTop: 12, marginBottom: 12 }} />

          <Flex direction="column" gap="2">
            <LegendItem color="#059669" label="Experienced Significant Improvement" value={breakdown.significant} />
            <LegendItem color="#34D399" label="Experienced Some Improvement" value={breakdown.some} />
            <LegendItem color="#D1D5DB" label="Experienced no improvement" value={breakdown.none} />
          </Flex>
        </Box>
      </Flex>
    </BorderedCard>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <Flex align="center" gap="3">
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: color,
          display: "inline-block",
        }}
      />
      <Text>
        <Text weight="bold">{pct}%</Text> {label}
      </Text>
    </Flex>
  );
}
