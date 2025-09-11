'use client'

import { Flex, Box, Grid } from "@radix-ui/themes"
import { DashboardLayout } from "@/components/DashboardLayout"
import { 
  SkeletonCard, 
  StatCard, 
  ActivityItem, 
  QuickActionItem, 
  TeamMemberItem, 
  ChartSkeleton 
} from "@/components/SkeletonCard"

export default function Home() {
  return (
    <DashboardLayout title="Dashboard">

      {/* Main Content Grid */}
      <Grid columns="3" gap="6">
        {/* Recent Activity */}
        <Box style={{ gridColumn: "span 2" }}>
          <SkeletonCard title="Recent Activity" height="400px">
            <Flex direction="column" gap="3">
              {[...Array(6)].map((_, i) => (
                <ActivityItem key={i} showBorder={i < 5} />
              ))}
            </Flex>
          </SkeletonCard>
        </Box>

        {/* Quick Actions */}
        <Box>
          <SkeletonCard title="Quick Actions" height="400px">
            <Flex direction="column" gap="3">
              {[...Array(5)].map((_, i) => (
                <QuickActionItem key={i} />
              ))}
            </Flex>
          </SkeletonCard>
        </Box>
      </Grid>

      {/* Bottom Section */}
      <Grid columns="2" gap="6">
        {/* Chart Placeholder */}
        <SkeletonCard title="Performance Overview" height="300px">
          <ChartSkeleton bars={12} />
        </SkeletonCard>

        {/* Team Status */}
        <SkeletonCard title="Team Status" height="300px">
          <Flex direction="column" gap="3">
            {[...Array(4)].map((_, i) => (
              <TeamMemberItem key={i} />
            ))}
          </Flex>
        </SkeletonCard>
      </Grid>
    </DashboardLayout>
  )
}