"use client";

import * as React from "react";
import { Card } from "@radix-ui/themes";

export type BorderedCardProps = React.ComponentProps<typeof Card>;

export default function BorderedCard({ style, radius = "3", ...props }: BorderedCardProps) {
  return (
    <Card
      radius={radius}
      style={{
        border: "1px solid var(--gray-5)",
        boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
        backgroundClip: "padding-box",
        ...style,
      }}
      {...props}
    />
  );
}

