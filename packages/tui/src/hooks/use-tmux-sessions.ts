/**
 * Hook that tracks all tmux sessions and the currently active one.
 *
 * Polls tmux every 2 seconds to get the list of sessions and which
 * one is currently attached. Used by the TmuxTabs component to
 * render a tab bar showing all sessions.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const POLL_INTERVAL = 2_000;

export interface TmuxSessionInfo {
  name: string;
  isAttached: boolean;
}

export interface TmuxSessionsState {
  sessions: TmuxSessionInfo[];
  currentSession: string | null;
}

function isInsideTmux(): boolean {
  return !!process.env["TMUX"];
}

async function fetchTmuxSessions(): Promise<TmuxSessionsState> {
  if (!isInsideTmux()) {
    return { sessions: [], currentSession: null };
  }

  try {
    const [listResult, currentResult] = await Promise.all([
      execFileAsync(
        "tmux",
        ["list-sessions", "-F", "#{session_name}:#{session_attached}"],
        { timeout: 5_000 },
      ),
      execFileAsync("tmux", ["display-message", "-p", "#{session_name}"], {
        timeout: 5_000,
      }),
    ]);

    const currentSession = currentResult.stdout.trim() || null;

    const sessions = listResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => {
        const lastColon = line.lastIndexOf(":");
        const name = line.slice(0, lastColon);
        const attached = line.slice(lastColon + 1) === "1";
        return { name, isAttached: attached };
      });

    return { sessions, currentSession };
  } catch {
    return { sessions: [], currentSession: null };
  }
}

export function useTmuxSessions(): TmuxSessionsState {
  const [state, setState] = useState<TmuxSessionsState>({
    sessions: [],
    currentSession: null,
  });
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    const result = await fetchTmuxSessions();
    if (mountedRef.current) {
      setState(result);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [poll]);

  return state;
}
