/**
 * Hook for session actions: kill, send message, restore, merge.
 */

import { useState, useCallback } from "react";
import type { MergeMethod, SCM, ProjectConfig } from "@composio/ao-core";
import { getServices, getSCM } from "../lib/services.js";
import { resolveProject } from "../lib/serialize.js";

export interface SessionActions {
  killSession: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, message: string) => Promise<void>;
  restoreSession: (sessionId: string) => Promise<void>;
  mergeSession: (sessionId: string, method: MergeMethod) => Promise<void>;
  actionError: string | null;
  actionSuccess: string | null;
  clearFeedback: () => void;
}

export function useSessionActions(): SessionActions {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearFeedback = useCallback(() => {
    setActionError(null);
    setActionSuccess(null);
  }, []);

  const killSession = useCallback(async (sessionId: string) => {
    try {
      const { sessionManager } = getServices();
      await sessionManager.kill(sessionId);
      setActionSuccess(`Killed session ${sessionId}`);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to kill ${sessionId}`);
      setActionSuccess(null);
    }
  }, []);

  const sendMessage = useCallback(async (sessionId: string, message: string) => {
    // eslint-disable-next-line no-control-regex
    const cleaned = message.replace(/[\x00-\x1f\x7f]/g, "").trim();
    if (cleaned.length === 0) {
      setActionError("Message is empty after sanitization");
      return;
    }
    try {
      const { sessionManager } = getServices();
      await sessionManager.send(sessionId, cleaned);
      setActionSuccess(`Sent message to ${sessionId}`);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to send to ${sessionId}`);
      setActionSuccess(null);
    }
  }, []);

  const restoreSession = useCallback(async (sessionId: string) => {
    try {
      const { sessionManager } = getServices();
      await sessionManager.restore(sessionId);
      setActionSuccess(`Restored session ${sessionId}`);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to restore ${sessionId}`);
      setActionSuccess(null);
    }
  }, []);

  const mergeSession = useCallback(async (sessionId: string, method: MergeMethod) => {
    try {
      const { config, registry, sessionManager } = getServices();
      const session = await sessionManager.get(sessionId);
      if (!session) {
        setActionError(`Session ${sessionId} not found`);
        return;
      }
      if (!session.pr) {
        setActionError(`Session ${sessionId} has no PR`);
        return;
      }
      const project: ProjectConfig | undefined = resolveProject(session, config.projects);
      const scm: SCM | null = getSCM(registry, project);
      if (!scm) {
        setActionError("No SCM plugin configured for this project");
        return;
      }
      await scm.mergePR(session.pr, method);
      setActionSuccess(`Merged PR #${session.pr.number} (${method})`);
      setActionError(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to merge PR for ${sessionId}`);
      setActionSuccess(null);
    }
  }, []);

  return {
    killSession,
    sendMessage,
    restoreSession,
    mergeSession,
    actionError,
    actionSuccess,
    clearFeedback,
  };
}
