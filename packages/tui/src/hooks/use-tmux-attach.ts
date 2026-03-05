/**
 * Hook for attaching to a tmux session.
 *
 * Temporarily exits Ink's raw mode, runs `tmux attach -t <target>`,
 * and restores when the user detaches (Ctrl+B, D).
 */

import { useCallback } from "react";
import { spawnSync } from "node:child_process";

export interface TmuxAttach {
  attach: (target: string) => void;
}

export function useTmuxAttach(onResume: () => void): TmuxAttach {
  const attach = useCallback(
    (target: string) => {
      // Exit Ink's raw mode so tmux can take over the terminal
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();

      // Clear screen before attaching
      process.stdout.write("\x1b[2J\x1b[H");

      // Run tmux attach synchronously — blocks until detach
      spawnSync("tmux", ["attach-session", "-t", target], {
        stdio: "inherit",
      });

      // Restore terminal for Ink
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();

      // Clear screen and trigger refresh
      process.stdout.write("\x1b[2J\x1b[H");
      onResume();
    },
    [onResume],
  );

  return { attach };
}
