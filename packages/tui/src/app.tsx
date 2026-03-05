import React, { useState, useMemo, useCallback } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  type DashboardSession,
  type AttentionLevel,
  getAttentionLevel,
  TERMINAL_STATUSES,
  NON_RESTORABLE_STATUSES,
} from "./lib/types.js";
import { useSessions } from "./hooks/use-sessions.js";
import { useSessionActions } from "./hooks/use-session-actions.js";
import { StatusBar } from "./components/status-bar.js";
import { SessionTable } from "./components/session-table.js";
import { SessionDetail } from "./components/session-detail.js";
import { HelpBar } from "./components/help-bar.js";
import { MessageInput } from "./components/message-input.js";
import { ConfirmDialog } from "./components/confirm-dialog.js";
import { FeedbackBar } from "./components/feedback-bar.js";

type View = "list" | "detail" | "message" | "confirm-kill" | "confirm-restore";

export function App() {
  const { exit } = useApp();
  const { sessions, stats, loading, error: loadError, refresh } = useSessions();
  const { killSession, sendMessage, restoreSession, actionError, actionSuccess, clearFeedback } =
    useSessionActions();

  const [view, setView] = useState<View>("list");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort sessions by attention level priority
  const sortedSessions = useMemo(() => {
    const order: AttentionLevel[] = ["merge", "respond", "review", "pending", "working", "done"];
    return [...sessions].sort((a, b) => {
      const aLevel = order.indexOf(getAttentionLevel(a));
      const bLevel = order.indexOf(getAttentionLevel(b));
      return aLevel - bLevel;
    });
  }, [sessions]);

  const zoneCounts = useMemo(() => {
    const counts: Record<AttentionLevel, number> = {
      merge: 0,
      respond: 0,
      review: 0,
      pending: 0,
      working: 0,
      done: 0,
    };
    for (const s of sessions) {
      counts[getAttentionLevel(s)]++;
    }
    return counts;
  }, [sessions]);

  const selectedSession: DashboardSession | undefined = sortedSessions[selectedIndex];

  const isTerminal = selectedSession ? TERMINAL_STATUSES.has(selectedSession.status) : false;

  const isRestorable = selectedSession
    ? isTerminal && !NON_RESTORABLE_STATUSES.has(selectedSession.status)
    : false;

  const handleSendMessage = useCallback(
    (sessionId: string, message: string) => {
      sendMessage(sessionId, message);
    },
    [sendMessage],
  );

  const handleKillConfirm = useCallback(() => {
    if (selectedSession) {
      killSession(selectedSession.id);
      refresh();
    }
    setView("list");
  }, [selectedSession, killSession, refresh]);

  const handleRestoreConfirm = useCallback(() => {
    if (selectedSession) {
      restoreSession(selectedSession.id);
      refresh();
    }
    setView("list");
  }, [selectedSession, restoreSession, refresh]);

  // Keyboard navigation
  useInput(
    (input, key) => {
      if (view === "message" || view === "confirm-kill" || view === "confirm-restore") {
        return;
      }

      if (view === "list") {
        if (input === "q") {
          exit();
          return;
        }
        if (input === "j" || key.downArrow) {
          setSelectedIndex((i) => Math.min(i + 1, sortedSessions.length - 1));
          return;
        }
        if (input === "k" || key.upArrow) {
          setSelectedIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (key.return && selectedSession) {
          setView("detail");
          return;
        }
        if (input === "m" && selectedSession && !isTerminal) {
          setView("message");
          return;
        }
        if (input === "K" && selectedSession && !isTerminal) {
          setView("confirm-kill");
          return;
        }
        if (input === "R" && selectedSession && isRestorable) {
          setView("confirm-restore");
          return;
        }
        if (input === "r") {
          refresh();
          return;
        }
      }

      if (view === "detail") {
        if (input === "q" || key.escape) {
          setView("list");
          return;
        }
        if (input === "m" && selectedSession && !isTerminal) {
          setView("message");
          return;
        }
        if (input === "k" && selectedSession && !isTerminal) {
          setView("confirm-kill");
          return;
        }
        if (input === "R" && selectedSession && isRestorable) {
          setView("confirm-restore");
          return;
        }
        if (input === "r") {
          refresh();
          return;
        }
      }
    },
    {
      isActive: view !== "message" && view !== "confirm-kill" && view !== "confirm-restore",
    },
  );

  // Clamp selected index when sessions change
  if (selectedIndex >= sortedSessions.length && sortedSessions.length > 0) {
    setSelectedIndex(sortedSessions.length - 1);
  }

  const helpView =
    view === "message"
      ? ("message" as const)
      : view === "detail"
        ? ("detail" as const)
        : ("list" as const);

  return (
    <Box flexDirection="column" minHeight={10}>
      {/* Status bar */}
      <Box borderStyle="single" borderBottom={false} borderLeft={false} borderRight={false}>
        <StatusBar stats={stats} zoneCounts={zoneCounts} loading={loading} />
      </Box>

      {/* Error display */}
      {loadError && (
        <Box paddingX={1}>
          <Text color="red">Error: {loadError}</Text>
        </Box>
      )}

      {/* Main content */}
      <Box flexDirection="column" flexGrow={1}>
        {view === "list" && (
          <SessionTable sessions={sortedSessions} selectedIndex={selectedIndex} />
        )}

        {view === "detail" && selectedSession && <SessionDetail session={selectedSession} />}

        {view === "message" && selectedSession && (
          <MessageInput
            sessionId={selectedSession.id}
            onSubmit={handleSendMessage}
            onCancel={() => setView(view === "message" ? "list" : "detail")}
          />
        )}

        {view === "confirm-kill" && selectedSession && (
          <ConfirmDialog
            message={`Kill session ${selectedSession.id}?`}
            onConfirm={handleKillConfirm}
            onCancel={() => setView("list")}
          />
        )}

        {view === "confirm-restore" && selectedSession && (
          <ConfirmDialog
            message={`Restore session ${selectedSession.id}?`}
            onConfirm={handleRestoreConfirm}
            onCancel={() => setView("list")}
          />
        )}
      </Box>

      {/* Feedback bar */}
      <FeedbackBar error={actionError} success={actionSuccess} onClear={clearFeedback} />

      {/* Help bar */}
      <Box borderStyle="single" borderTop={false} borderLeft={false} borderRight={false}>
        <HelpBar view={helpView} />
      </Box>
    </Box>
  );
}
