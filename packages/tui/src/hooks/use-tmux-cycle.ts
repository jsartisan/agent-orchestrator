/**
 * Hook that cycles between tmux sessions on Tab press.
 *
 * Queries tmux directly for all available sessions and rotates
 * through them using `tmux switch-client`. This works regardless
 * of whether the session manager knows about the sessions — any
 * tmux session (orchestrator, workers, manual) is included.
 *
 * Only works when running inside tmux (TMUX env var set).
 */

import { useCallback, useRef } from "react";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function isInsideTmux(): boolean {
  return !!process.env["TMUX"];
}

/**
 * Lists all tmux session names.
 */
async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      "tmux",
      ["list-sessions", "-F", "#{session_name}"],
      { timeout: 5_000 },
    );
    return stdout
      .trim()
      .split("\n")
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

/**
 * Returns the current tmux client's session name, or null.
 */
async function getCurrentTmuxSession(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "tmux",
      ["display-message", "-p", "#{session_name}"],
      { timeout: 5_000 },
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export interface TmuxCycleState {
  cycleNext: () => void;
}

/**
 * Cycle to the next tmux session.
 *
 * Queries tmux for all sessions, finds the current one, and
 * switches to the next in the list. Wraps around at the end.
 */
export function useTmuxCycle(): TmuxCycleState {
  const cyclingRef = useRef(false);

  const cycleNext = useCallback(() => {
    if (!isInsideTmux() || cyclingRef.current) {
      return;
    }

    cyclingRef.current = true;

    void (async () => {
      try {
        const [sessions, current] = await Promise.all([
          listTmuxSessions(),
          getCurrentTmuxSession(),
        ]);

        if (sessions.length < 2) return;

        const currentIndex = current ? sessions.indexOf(current) : -1;
        const nextIndex = (currentIndex + 1) % sessions.length;
        const next = sessions[nextIndex];

        if (next && next !== current) {
          await execFileAsync("tmux", ["switch-client", "-t", next], {
            timeout: 5_000,
          });
        }
      } catch {
        // Target may not exist — ignore
      } finally {
        cyclingRef.current = false;
      }
    })();
  }, []);

  return { cycleNext };
}
