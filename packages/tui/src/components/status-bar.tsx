import React from "react";
import { Box, Text } from "ink";
import type { DashboardStats, AttentionLevel } from "../lib/types.js";

interface StatusBarProps {
  stats: DashboardStats;
  zoneCounts: Record<AttentionLevel, number>;
  loading: boolean;
}

const ZONE_COLORS: Record<AttentionLevel, string> = {
  merge: "green",
  respond: "red",
  review: "#d18616",
  pending: "yellow",
  working: "blue",
  done: "gray",
};

export function StatusBar({ stats, zoneCounts, loading }: StatusBarProps) {
  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
      <Box gap={2}>
        <Text bold>Orchestrator</Text>
        <Text dimColor>
          {stats.totalSessions} sessions
          {stats.workingSessions > 0 && <Text color="blue"> {stats.workingSessions} working</Text>}
          {stats.openPRs > 0 && <Text> {stats.openPRs} PRs</Text>}
          {stats.needsReview > 0 && <Text color="yellow"> {stats.needsReview} need review</Text>}
        </Text>
      </Box>
      <Box gap={1}>
        {(Object.entries(zoneCounts) as Array<[AttentionLevel, number]>)
          .filter(([, count]) => count > 0)
          .map(([zone, count]) => (
            <Text key={zone} color={ZONE_COLORS[zone]}>
              {zone}:{count}
            </Text>
          ))}
        {loading && <Text color="yellow"> loading...</Text>}
      </Box>
    </Box>
  );
}
