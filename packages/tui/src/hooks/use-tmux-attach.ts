/**
 * Hook for switching to a tmux session.
 *
 * If already inside tmux, uses `tmux switch-client -t <target>` for
 * instant tab-style switching (visible in the tmux status bar).
 * The TUI keeps running in its own tmux window — switch back with
 * Ctrl+B, w (window list) or Ctrl+B, L (last session).
 *
 * If not inside tmux, falls back to `tmux attach -t <target>` which
 * takes over the terminal until the user detaches (Ctrl+B, D).
 */

import { useCallback } from "react";
import { execFileSync, spawnSync } from "node:child_process";

export interface TmuxAttach {
  attach: (target: string) => void;
}

function isInsideTmux(): boolean {
  return !!process.env["TMUX"];
}

export function useTmuxAttach(onResume: () => void): TmuxAttach {
  const attach = useCallback(
    (target: string) => {
      if (isInsideTmux()) {
        // Inside tmux — use switch-client for tab-style navigation.
        // This is non-blocking: the TUI keeps running, tmux just
        // switches the visible session in the status bar.
        try {
          execFileSync("tmux", ["switch-client", "-t", target], {
            timeout: 5_000,
          });
        } catch {
          // Target session may not exist — ignore
        }
        return;
      }

      // Not inside tmux — fall back to attach (blocks until detach)
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();

      process.stdout.write("\x1b[2J\x1b[H");

      spawnSync("tmux", ["attach-session", "-t", target], {
        stdio: "inherit",
      });

      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      process.stdout.write("\x1b[2J\x1b[H");
      onResume();
    },
    [onResume],
  );

  return { attach };
}
