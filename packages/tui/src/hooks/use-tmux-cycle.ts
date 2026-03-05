/**
 * Hook that cycles between tmux windows on Tab press.
 *
 * Builds an ordered list of tmux targets:
 *   [TUI window, orchestrator session, ...active worker sessions]
 * and rotates through them using `tmux switch-client`.
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
 * Returns the current tmux client target session name, or null.
 */
async function getCurrentTmuxTarget(): Promise<string | null> {
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
  cycleNext: (targets: string[]) => void;
}

/**
 * Cycle to the next tmux session in the given target list.
 *
 * @param targets - Ordered list of tmux session names to cycle through.
 *   The first entry should be the TUI's own session so we cycle back to it.
 */
export function useTmuxCycle(): TmuxCycleState {
  const cyclingRef = useRef(false);

  const cycleNext = useCallback((targets: string[]) => {
    if (!isInsideTmux() || targets.length === 0 || cyclingRef.current) {
      return;
    }

    cyclingRef.current = true;

    void (async () => {
      try {
        const current = await getCurrentTmuxTarget();
        let nextIndex = 0;

        if (current) {
          const currentIndex = targets.indexOf(current);
          if (currentIndex >= 0) {
            nextIndex = (currentIndex + 1) % targets.length;
          }
        }

        const next = targets[nextIndex];
        if (next && next !== current) {
          await execFileAsync("tmux", ["switch-client", "-t", next], {
            timeout: 5_000,
          });
        } else if (next && targets.length > 1) {
          // Current matches next, advance one more
          nextIndex = (nextIndex + 1) % targets.length;
          const nextTarget = targets[nextIndex];
          if (!nextTarget) return;
          await execFileAsync("tmux", ["switch-client", "-t", nextTarget], {
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
