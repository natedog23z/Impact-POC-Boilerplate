'use client';

import { Box, Heading, Text, Card, Flex, Button } from '@radix-ui/themes';
import { useRouter } from 'next/navigation';

export default function ToolsPage() {
  const router = useRouter();

  return (
    <Box style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <Heading size="6">Impact Sandbox Tools</Heading>
      <Text size="3" color="gray" style={{ marginTop: 8 }}>
        Choose how you want to generate and preview impact dashboards
      </Text>

      <Flex direction="column" gap="4" style={{ marginTop: 32 }}>
        <Card variant="classic" style={{ cursor: 'pointer' }} onClick={() => router.push('/tools/mock-sessions')}>
          <Flex direction="column" gap="2">
            <Heading size="4">Generate from one example</Heading>
            <Text size="3" color="gray">
              Upload a single session example, then generate multiple mock sessions with varied sentiment, demographics, and outcomes. Configure generation parameters like sentiment mix and omission probability.
            </Text>
            <Box style={{ marginTop: 8 }}>
              <Button variant="soft">
                Open Mock Session Generator →
              </Button>
            </Box>
          </Flex>
        </Card>

        <Card variant="classic" style={{ cursor: 'pointer' }} onClick={() => router.push('/tools/cohort-upload')}>
          <Flex direction="column" gap="2">
            <Heading size="4">Upload a cohort</Heading>
            <Text size="3" color="gray">
              Upload a multi-session cohort file (multiple participants in one document) and preview the impact dashboard directly. Bypasses mock generation—ideal for testing with real or prepared cohort data.
            </Text>
            <Box style={{ marginTop: 8 }}>
              <Button variant="soft">
                Open Cohort Upload →
              </Button>
            </Box>
          </Flex>
        </Card>
      </Flex>
    </Box>
  );
}

