"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type ReasonItem = {
  title: string;
  description: string;
  percent: number; // 0-100
};

export type ParticipantReasonsCardProps = {
  prose: string;
  reasons: ReasonItem[];
  offeringName?: string;
};

export default function ParticipantReasonsCard({ prose, reasons, offeringName }: ParticipantReasonsCardProps) {
  return (
    <BorderedCard
      style={{
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>
        What is the reason for wanting {offeringName ?? "this offering"}?
      </Heading>
      <Text size="3" style={{ lineHeight: 1.6 }}>{prose}</Text>

      <Flex direction="column" gap="3" style={{ marginTop: 16 }}>
        {reasons?.length ? reasons.map((r, i) => (
          <ReasonRow key={i} title={r.title} description={r.description} percent={r.percent} />
        )) : (
          <Text color="gray">No application reasons available.</Text>
        )}
      </Flex>
    </BorderedCard>
  );
}

function ReasonRow({ title, description, percent }: { title: string; description: string; percent: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <Flex align="start" justify="between" gap="4">
      <Box style={{ flex: 1 }}>
        <Text weight="bold">{title}</Text>
        <Text as="p" size="2" style={{ marginTop: 2 }}>{description}</Text>
      </Box>
      <Badge percent={pct} />
    </Flex>
  );
}

function Badge({ percent }: { percent: number }) {
  const bg = percent >= 40 ? "#2563EB" : percent >= 25 ? "#7C3AED" : "#6B7280";
  return (
    <Box
      style={{
        minWidth: 64,
        padding: "4px 8px",
        borderRadius: 8,
        backgroundColor: bg,
        color: "white",
        textAlign: "center",
        fontWeight: 600,
      }}
    >
      {percent}%
    </Box>
  );
}


