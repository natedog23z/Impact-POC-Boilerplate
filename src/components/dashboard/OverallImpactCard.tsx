"use client";

import React from "react";
import { Card, Heading, Text } from "@radix-ui/themes";

export type OverallImpactCardProps = {
  prose: string;
};

export default function OverallImpactCard({ prose }: OverallImpactCardProps) {
  return (
    <Card
      variant="surface"
      style={{
        padding: 24,
        borderRadius: 18,
        minHeight: 220,
        boxSizing: 'border-box',
        border: '1px solid var(--gray-5)',
        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>Overall Impact</Heading>
      <Text size="3" style={{ lineHeight: 1.6 }}>{prose}</Text>
    </Card>
  );
}
