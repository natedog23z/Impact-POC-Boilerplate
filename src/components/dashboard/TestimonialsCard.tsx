"use client";

import React, { useMemo, useState } from "react";
import { Box, Flex, Heading, IconButton, Text } from "@radix-ui/themes";
import BorderedCard from "@/components/BorderedCard";
import type { SessionQuote } from "@/types/schemas";

export type TestimonialsCardProps = {
  title?: string;
  quotes: ReadonlyArray<SessionQuote>;
  sourceNote?: string;
};

function pickInitialIndex(quotes: ReadonlyArray<SessionQuote>): number {
  if (!quotes.length) return 0;
  // Heuristic: prefer quotes with 80–180 chars and with a theme when available
  const scored = quotes.map((q, i) => {
    const length = q.text.length;
    const lengthScore = length >= 80 && length <= 180 ? 2 : length >= 40 ? 1 : 0;
    const themeScore = q.theme ? 1 : 0;
    const punctuationScore = /[.!?]$/.test(q.text.trim()) ? 1 : 0;
    return { i, score: lengthScore + themeScore + punctuationScore, tie: -length };
  });
  scored.sort((a, b) => (b.score - a.score) || (a.tie - b.tie));
  return scored[0]?.i ?? 0;
}

export default function TestimonialsCard({ title = "Testimonials", quotes, sourceNote }: TestimonialsCardProps) {
  const initialIndex = useMemo(() => pickInitialIndex(quotes), [quotes]);
  const [index, setIndex] = useState<number>(initialIndex);

  const goPrev = () => setIndex((i) => (quotes.length ? (i - 1 + quotes.length) % quotes.length : 0));
  const goNext = () => setIndex((i) => (quotes.length ? (i + 1) % quotes.length : 0));

  const current = quotes[index] ?? null;

  return (
    <BorderedCard
      style={{
        padding: 24,
        minHeight: 220,
        boxSizing: "border-box",
      }}
    >
      <Heading size="5" style={{ marginBottom: 10 }}>{title}</Heading>

      {current ? (
        <Box
          style={{
            borderRadius: 12,
            background: "var(--gray-2)",
            padding: 20,
          }}
        >
          <Flex align="center" justify="between" style={{ marginBottom: 8 }}>
            <IconButton variant="soft" radius="full" onClick={goPrev} disabled={quotes.length <= 1}>
              ‹
            </IconButton>
            <IconButton variant="soft" radius="full" onClick={goNext} disabled={quotes.length <= 1}>
              ›
            </IconButton>
          </Flex>

          <Text size="6" style={{ display: "block", lineHeight: 1.4 }}>
            “{current.text}”
          </Text>

          <Flex direction="column" style={{ marginTop: 14 }}>
            {current.theme && (
              <Text size="2" color="gray" style={{ fontWeight: 600 }}>
                {current.theme}
              </Text>
            )}
            <Text size="2" color="gray">
              {current.sessionId}
            </Text>
          </Flex>

          {sourceNote && (
            <Text size="1" color="gray" style={{ marginTop: 8 }}>
              {sourceNote}
            </Text>
          )}
        </Box>
      ) : (
        <Text size="3" color="gray">No quotes available.</Text>
      )}
    </BorderedCard>
  );
}


