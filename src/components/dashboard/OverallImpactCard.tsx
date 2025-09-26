"use client";

import React from "react";
import { Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type OverallImpactCardProps = {
  prose: string;
};

export default function OverallImpactCard({ prose }: OverallImpactCardProps) {
  return (
    <BorderedCard
      style={{
        padding: 24,
        minHeight: 220,
        boxSizing: "border-box",
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>Overall Impact</Heading>
      <Text size="3" style={{ lineHeight: 1.6 }}>{prose}</Text>
    </BorderedCard>
  );
}
