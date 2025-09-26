"use client";

import React from "react";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";

export type StrengthItem = {
  title: string;
  description: string;
};

export type StrengthsImprovementsCardProps = {
  prose: string;
  strengths: StrengthItem[];
  improvements: StrengthItem[];
};

export default function StrengthsImprovementsCard({ prose, strengths, improvements }: StrengthsImprovementsCardProps) {
  return (
    <BorderedCard
      style={{
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>Program Strengths</Heading>
      <Text size="3" style={{ lineHeight: 1.6 }}>{prose}</Text>

      <Flex gap="6" wrap="wrap" style={{ marginTop: 16 }}>
        <Box style={{ flex: 1, minWidth: 320 }}>
          <Heading size="4" style={{ marginBottom: 8 }}>Strengths</Heading>
          <Flex direction="column" gap="2">
            {strengths?.length ? strengths.map((s, i) => (
              <Item key={`s-${i}`} title={s.title} description={s.description} iconColor="#059669" />
            )) : (
              <Text color="gray">No strengths identified yet.</Text>
            )}
          </Flex>
        </Box>
        <Box style={{ flex: 1, minWidth: 320 }}>
          <Heading size="4" style={{ marginBottom: 8 }}>Areas for Program Improvement</Heading>
          <Flex direction="column" gap="2">
            {improvements?.length ? improvements.map((s, i) => (
              <Item key={`i-${i}`} title={s.title} description={s.description} iconColor="#F59E0B" />
            )) : (
              <Text color="gray">No improvement areas identified yet.</Text>
            )}
          </Flex>
        </Box>
      </Flex>
    </BorderedCard>
  );
}

function Item({ title, description, iconColor }: { title: string; description: string; iconColor: string }) {
  return (
    <Flex align="start" gap="3">
      <span
        aria-hidden
        style={{
          width: 18,
          height: 18,
          marginTop: 4,
          borderRadius: 9,
          backgroundColor: iconColor,
          display: "inline-block",
        }}
      />
      <Box>
        <Text weight="bold">{title}</Text>
        <Text as="p" size="2" style={{ marginTop: 2 }}>
          {description}
        </Text>
      </Box>
    </Flex>
  );
}


