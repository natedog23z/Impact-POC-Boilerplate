"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type CategoryItem = {
  key: string;
  title: string;
  description?: string;
  percentImproved: number | null; // 0..1
};

export type FlourishingOutcomesGridProps = {
  prose: string;
  categories: CategoryItem[];
};

export default function FlourishingOutcomesGrid({ prose, categories }: FlourishingOutcomesGridProps) {
  const items = Array.isArray(categories) ? categories : [];
  return (
    <Box>
      <Heading size="3" style={{ marginBottom: 8 }}>Flourishing Outcomes</Heading>
      <Text style={{ display: "block", marginBottom: 12 }}>{prose}</Text>
      <Flex gap="4" wrap="wrap">
        {items.length ? items.map((c) => (
          <OutcomeCard key={c.key} title={c.title} description={c.description} percentImproved={c.percentImproved} />
        )) : (
          <Text color="gray">No categorized outcomes available.</Text>
        )}
      </Flex>
    </Box>
  );
}

function OutcomeCard({ title, description, percentImproved }: { title: string; description?: string; percentImproved: number | null }) {
  const pct = Math.round(((percentImproved ?? 0) || 0) * 100);
  return (
    <BorderedCard
      style={{
        padding: 20,
        width: 360,
        boxSizing: "border-box",
      }}
    >
      <Heading size="4" style={{ marginBottom: 8 }}>{title}</Heading>
      <Flex align="baseline" gap="2">
        <Heading size="7">{pct}%</Heading>
        <Text color="green" size="2">Improved</Text>
      </Flex>
      {description ? (
        <Text color="gray" size="2" style={{ display: "block", marginTop: 8 }}>{description}</Text>
      ) : null}
      <ProgressBar value={percentImproved ?? 0} />
      <LegendRows />
    </BorderedCard>
  );
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <Box style={{ marginTop: 12 }}>
      <Box style={{ height: 10, background: "#F3F4F6", borderRadius: 6 }}>
        <Box style={{ width: `${Math.round(pct * 100)}%`, height: 10, background: "#10B981", borderRadius: 6 }} />
      </Box>
    </Box>
  );
}

function LegendRows() {
  return (
    <Box style={{ marginTop: 10 }}>
      <LegendRow label="Significant" value={0.4} />
      <LegendRow label="Some" value={0.5} />
      <LegendRow label="None" value={0.1} muted />
    </Box>
  );
}

function LegendRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <Flex align="center" gap="3" style={{ marginTop: 4 }}>
      <Box style={{ flex: 1 }}>
        <Text color={muted ? "gray" : undefined}>{label}</Text>
      </Box>
      <Box style={{ flex: 4 }}>
        <Box style={{ height: 8, background: muted ? "#E5E7EB" : "#D1FAE5", borderRadius: 6 }}>
          <Box style={{ width: `${pct}%`, height: 8, background: muted ? "#D1D5DB" : "#10B981", borderRadius: 6 }} />
        </Box>
      </Box>
      <Box style={{ width: 40, textAlign: "right" }}>
        <Text color={muted ? "gray" : undefined}>{pct}%</Text>
      </Box>
    </Flex>
  );
}


