import React from "react";
import { Box, Text } from "ink";
import type { TmuxSessionInfo } from "../hooks/use-tmux-sessions.js";

interface TmuxTabsProps {
  sessions: TmuxSessionInfo[];
  currentSession: string | null;
}

export function TmuxTabs({ sessions, currentSession }: TmuxTabsProps) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <Box paddingX={1} gap={1}>
      {sessions.map((session, index) => {
        const isCurrent = session.name === currentSession;
        return (
          <React.Fragment key={session.name}>
            {index > 0 && <Text dimColor>│</Text>}
            <Text
              bold={isCurrent}
              color={isCurrent ? "cyan" : undefined}
              dimColor={!isCurrent}
            >
              {isCurrent ? "▸ " : "  "}
              {session.name}
            </Text>
          </React.Fragment>
        );
      })}
    </Box>
  );
}
