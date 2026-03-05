import React from "react";
import { Box, Text } from "ink";
import {
  type DashboardSession,
  type AttentionLevel,
  getAttentionLevel,
  isPRMergeReady,
  TERMINAL_STATUSES,
} from "../lib/types.js";
import {
  getSessionTitle,
  truncate,
  relativeTime,
  attentionLabel,
  activityLabel,
  ciLabel,
} from "../lib/format.js";

interface SessionTableProps {
  sessions: DashboardSession[];
  selectedIndex: number;
}

const ZONE_COLORS: Record<AttentionLevel, string> = {
  merge: "green",
  respond: "red",
  review: "#d18616",
  pending: "yellow",
  working: "blue",
  done: "gray",
};

const ACTIVITY_COLORS: Record<string, string> = {
  active: "green",
  ready: "cyan",
  idle: "yellow",
  waiting_input: "red",
  blocked: "red",
  exited: "gray",
};

export function SessionTable({ sessions, selectedIndex }: SessionTableProps) {
  if (sessions.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>No sessions found. Start one with: ao spawn</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header */}
      <Box>
        <Box width={3}>
          <Text dimColor> </Text>
        </Box>
        <Box width={8}>
          <Text bold dimColor>
            ZONE
          </Text>
        </Box>
        <Box width={22}>
          <Text bold dimColor>
            SESSION
          </Text>
        </Box>
        <Box width={12}>
          <Text bold dimColor>
            ACTIVITY
          </Text>
        </Box>
        <Box width={8}>
          <Text bold dimColor>
            PR
          </Text>
        </Box>
        <Box width={11}>
          <Text bold dimColor>
            CI
          </Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>
            REVIEW
          </Text>
        </Box>
        <Box width={10}>
          <Text bold dimColor>
            UPDATED
          </Text>
        </Box>
        <Box flexGrow={1}>
          <Text bold dimColor>
            TITLE
          </Text>
        </Box>
      </Box>

      {/* Rows */}
      {sessions.map((session, index) => (
        <SessionRow key={session.id} session={session} selected={index === selectedIndex} />
      ))}
    </Box>
  );
}

interface SessionRowProps {
  session: DashboardSession;
  selected: boolean;
}

function SessionRow({ session, selected }: SessionRowProps) {
  const level = getAttentionLevel(session);
  const zoneColor = ZONE_COLORS[level];
  const actColor = ACTIVITY_COLORS[session.activity ?? ""] ?? "gray";
  const title = getSessionTitle(session);
  const isTerminal = TERMINAL_STATUSES.has(session.status);
  const mergeReady = session.pr ? isPRMergeReady(session.pr) : false;

  const prText = session.pr ? `#${session.pr.number}` : "-";

  const ci = session.pr ? ciLabel(session.pr.ciStatus) : "-";

  const review = session.pr
    ? session.pr.reviewDecision === "none"
      ? "-"
      : session.pr.reviewDecision
    : "-";

  const reviewColor =
    review === "approved"
      ? "green"
      : review === "changes_requested"
        ? "red"
        : review === "pending"
          ? "yellow"
          : undefined;

  const ciColor =
    session.pr?.ciStatus === "passing"
      ? "green"
      : session.pr?.ciStatus === "failing"
        ? "red"
        : session.pr?.ciStatus === "pending"
          ? "yellow"
          : undefined;

  return (
    <Box>
      <Box width={3}>
        <Text>{selected ? ">" : " "} </Text>
      </Box>
      <Box width={8}>
        <Text color={zoneColor}>{attentionLabel(level).toLowerCase().padEnd(7)}</Text>
      </Box>
      <Box width={22}>
        <Text color={isTerminal ? "gray" : undefined} dimColor={isTerminal}>
          {truncate(session.id, 20)}
        </Text>
      </Box>
      <Box width={12}>
        <Text color={actColor}>{truncate(activityLabel(session.activity), 10)}</Text>
      </Box>
      <Box width={8}>
        <Text color={mergeReady ? "green" : undefined}>{prText.padEnd(7)}</Text>
      </Box>
      <Box width={11}>
        <Text color={ciColor}>{truncate(ci, 10)}</Text>
      </Box>
      <Box width={10}>
        <Text color={reviewColor}>{truncate(review, 9)}</Text>
      </Box>
      <Box width={10}>
        <Text dimColor>{relativeTime(session.lastActivityAt)}</Text>
      </Box>
      <Box flexGrow={1}>
        <Text color={mergeReady ? "green" : isTerminal ? "gray" : undefined} dimColor={isTerminal}>
          {truncate(title, 50)}
        </Text>
      </Box>
    </Box>
  );
}
