"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type ThemeItem = {
  title: string;
  description: string;
  percentMentioned: number | null; // 0-100, may be null when unknown
};

export type KeyThemesCardProps = {
  prose: string;
  themes: ThemeItem[];
  title?: string;
  sourceNote?: string;
};

export default function KeyThemesCard({ prose, themes, title = "Key Themes", sourceNote }: KeyThemesCardProps) {
  return (
    <BorderedCard
      style={{
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>{title}</Heading>
      <Text size="3" style={{ lineHeight: 1.6 }}>{prose}</Text>

      <Flex gap="4" wrap="wrap" style={{ marginTop: 16 }}>
        {themes?.length ? themes.map((t, i) => (
          <ThemeTile key={i} title={t.title} description={t.description} percent={t.percentMentioned ?? undefined} />
        )) : (
          <Text color="gray">No themes identified yet.</Text>
        )}
      </Flex>

      {sourceNote ? (
        <Text size="1" color="gray" style={{ marginTop: 12, display: "block", textAlign: "right" }}>
          {sourceNote}
        </Text>
      ) : null}
    </BorderedCard>
  );
}

function ThemeTile({ title, description, percent }: { title: string; description: string; percent?: number }) {
  const pct = typeof percent === "number" ? Math.max(0, Math.min(100, Math.round(percent))) : undefined;
  return (
    <Box
      style={{
        flex: 1,
        minWidth: 320,
        border: "1px solid var(--gray-4)",
        borderRadius: 12,
        padding: 16,
        backgroundColor: "white",
      }}
    >
      <Flex align="center" justify="between" style={{ marginBottom: 6 }}>
        <Text weight="bold">{title}</Text>
        {typeof pct === "number" ? <Badge percent={pct} /> : null}
      </Flex>
      <Text as="p" size="2" style={{ lineHeight: 1.5 }}>{description}</Text>
    </Box>
  );
}

function Badge({ percent }: { percent: number }) {
  const bg = percent >= 60 ? "#111827" : percent >= 40 ? "#374151" : "#6B7280";
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


