"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type KacItem = {
  title: string;
  description: string;
};

export type KeyAreasChallengesProps = {
  leftTitle?: string;
  rightTitle?: string;
  proseLeft: string;
  proseRight: string;
  impacts: KacItem[];
  challenges: KacItem[];
};

export default function KeyAreasChallengesCard({
  leftTitle = "Key Areas of Impact",
  rightTitle = "Primary Challenges Addressed",
  proseLeft,
  proseRight,
  impacts,
  challenges,
}: KeyAreasChallengesProps) {
  return (
    <BorderedCard
      style={{
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <Flex gap="6" wrap="wrap">
        <Box style={{ flex: 1, minWidth: 360 }}>
          <Heading size="5" style={{ marginBottom: 10 }}>
            {leftTitle}
          </Heading>
          <Text size="3" style={{ lineHeight: 1.6 }}>
            {proseLeft}
          </Text>
          <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
            {impacts?.length ? (
              impacts.map((it, i) => (
                <Item key={`impact-${i}`} title={it.title} description={it.description} />
              ))
            ) : (
              <Text color="gray">No impact areas identified yet.</Text>
            )}
          </Flex>
        </Box>

        <Box style={{ flex: 1, minWidth: 360 }}>
          <Heading size="5" style={{ marginBottom: 10 }}>
            {rightTitle}
          </Heading>
          <Text size="3" style={{ lineHeight: 1.6 }}>
            {proseRight}
          </Text>
          <Flex direction="column" gap="2" style={{ marginTop: 12 }}>
            {challenges?.length ? (
              challenges.map((it, i) => (
                <Item key={`challenge-${i}`} title={it.title} description={it.description} variant="challenge" />
              ))
            ) : (
              <Text color="gray">No challenge areas identified yet.</Text>
            )}
          </Flex>
        </Box>
      </Flex>
    </BorderedCard>
  );
}

function Item({ title, description, variant = "impact" }: { title: string; description: string; variant?: "impact" | "challenge" }) {
  const color = variant === "impact" ? "#111827" : "#111827";
  return (
    <Flex align="start" gap="3">
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          marginTop: 4,
          borderRadius: 9,
          backgroundColor: variant === "impact" ? "#2563EB" : "#F59E0B",
          display: "inline-block",
        }}
      />
      <Box>
        <Text weight="bold" style={{ color }}>{title}</Text>
        <Text as="p" size="2" style={{ marginTop: 2 }}>
          {description}
        </Text>
      </Box>
    </Flex>
  );
}


