'use client'

import { Card, Skeleton, Flex, Box, Text, Badge } from "@radix-ui/themes"

interface SkeletonCardProps {
  title?: string
  height?: string
  padding?: string
  children?: React.ReactNode
}

export function SkeletonCard({ 
  title, 
  height = "auto", 
  padding = "24px",
  children 
}: SkeletonCardProps) {
  return (
    <Card style={{ padding, height }}>
      <Flex direction="column" gap="4">
        {title && (
          <Flex justify="between" align="center">
            <Text size="4" weight="medium">{title}</Text>
            <Skeleton width="80px" height="28px" />
          </Flex>
        )}
        {children}
      </Flex>
    </Card>
  )
}

// Stat Card with skeleton number and badge
export function StatCard({ 
  label, 
  badgeColor = "gray", 
  badgeText, 
  subText 
}: { 
  label: string
  badgeColor?: "gray" | "green" | "blue" | "orange" | "purple" | "red"
  badgeText?: string
  subText?: string
}) {
  return (
    <Card style={{ padding: "20px" }}>
      <Flex direction="column" gap="2">
        <Text size="2" color="gray" weight="medium">{label}</Text>
        <Skeleton width="60px" height="32px" />
        <Flex align="center" gap="2">
          {badgeText && <Badge color={badgeColor} size="1">{badgeText}</Badge>}
          {subText && <Text size="1" color="gray">{subText}</Text>}
        </Flex>
      </Flex>
    </Card>
  )
}

// Activity Item with skeleton avatar and text
export function ActivityItem({ showBorder = true }: { showBorder?: boolean }) {
  return (
    <Flex 
      align="center" 
      gap="3" 
      style={{ 
        padding: "12px 0", 
        borderBottom: showBorder ? "1px solid var(--gray-6)" : "none" 
      }}
    >
      <Skeleton width="40px" height="40px" style={{ borderRadius: "50%" }} />
      <Box style={{ flex: 1 }}>
        <Skeleton width="200px" height="16px" style={{ marginBottom: "4px" }} />
        <Skeleton width="120px" height="12px" />
      </Box>
      <Skeleton width="60px" height="12px" />
    </Flex>
  )
}

// Quick Action Item
export function QuickActionItem() {
  return (
    <Box style={{ padding: "12px", border: "1px solid var(--gray-6)", borderRadius: "8px" }}>
      <Flex align="center" gap="3">
        <Skeleton width="20px" height="20px" />
        <Box style={{ flex: 1 }}>
          <Skeleton width="120px" height="14px" style={{ marginBottom: "4px" }} />
          <Skeleton width="80px" height="10px" />
        </Box>
      </Flex>
    </Box>
  )
}

// Team Member Item
export function TeamMemberItem() {
  return (
    <Flex align="center" gap="3" style={{ padding: "12px 0" }}>
      <Skeleton width="48px" height="48px" style={{ borderRadius: "50%" }} />
      <Box style={{ flex: 1 }}>
        <Skeleton width="140px" height="16px" style={{ marginBottom: "6px" }} />
        <Skeleton width="100px" height="12px" />
      </Box>
      <Skeleton width="60px" height="20px" style={{ borderRadius: "12px" }} />
    </Flex>
  )
}

// Chart Skeleton
export function ChartSkeleton({ bars = 12 }: { bars?: number }) {
  return (
    <Box style={{ flex: 1, display: "flex", alignItems: "end", justifyContent: "space-around", gap: "8px" }}>
      {[...Array(bars)].map((_, i) => (
        <Skeleton 
          key={i} 
          width="20px" 
          height={`${Math.random() * 150 + 50}px`}
          style={{ borderRadius: "4px 4px 0 0" }}
        />
      ))}
    </Box>
  )
}
