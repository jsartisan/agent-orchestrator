import { spawn, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import chalk from "chalk";
import type { Command } from "commander";
import { loadConfig } from "@composio/ao-core";
import { findWebDir, findTuiDir, buildDashboardEnv, waitForPortAndOpen } from "../lib/web-dir.js";
import { cleanNextCache, findRunningDashboardPid, findProcessWebDir, waitForPortFree } from "../lib/dashboard-rebuild.js";

export function registerDashboard(program: Command): void {
  program
    .command("dashboard")
    .description("Start the web or TUI dashboard")
    .option("-p, --port <port>", "Port to listen on")
    .option("--no-open", "Don't open browser automatically")
    .option("--rebuild", "Clean stale build artifacts and rebuild before starting")
    .option("--tui", "Use terminal UI dashboard instead of web dashboard")
    .action(async (opts: { port?: string; open?: boolean; rebuild?: boolean; tui?: boolean }) => {
      const config = loadConfig();
      const useTui = opts.tui ?? config.dashboard === "tui";

      if (useTui) {
        const tuiDir = findTuiDir();
        if (!existsSync(resolve(tuiDir, "package.json"))) {
          console.error(chalk.red("Could not find @composio/ao-tui package. Run: pnpm install"));
          process.exit(1);
        }
        if (!existsSync(resolve(tuiDir, "dist/index.js"))) {
          console.error(chalk.red("@composio/ao-tui is not built. Run: pnpm build"));
          process.exit(1);
        }

        const env: Record<string, string> = { ...process.env } as Record<string, string>;
        if (config.configPath) {
          env["AO_CONFIG_PATH"] = config.configPath;
        }

        const tuiSessionName = "ao-tui";

        if (process.env["TMUX"]) {
          // Already in tmux — run TUI directly
          const child = spawn("node", ["dist/index.js"], {
            cwd: tuiDir,
            stdio: "inherit",
            detached: false,
            env,
          });
          child.on("error", (err) => {
            console.error(chalk.red("TUI failed to start:"), err.message);
            process.exit(1);
          });
          child.on("exit", (code) => {
            process.exit(code ?? 0);
          });
          return;
        }

        // Not in tmux — launch TUI inside a tmux session for Tab cycling
        const tuiEntrypoint = resolve(tuiDir, "dist/index.js");

        // Kill stale TUI session if it exists
        try {
          execFileSync("tmux", ["kill-session", "-t", tuiSessionName], {
            timeout: 5_000,
            stdio: "ignore",
          });
        } catch {
          // Session didn't exist
        }

        // Build tmux env args
        const envArgs: string[] = [];
        if (config.configPath) {
          envArgs.push("-e", `AO_CONFIG_PATH=${config.configPath}`);
        }

        execFileSync(
          "tmux",
          ["new-session", "-d", "-s", tuiSessionName, ...envArgs, "node", tuiEntrypoint],
          { timeout: 10_000 },
        );

        // Bind Shift+Tab to cycle only ao sessions for this project
        const prefixes = Object.values(config.projects)
          .map((p) => p.sessionPrefix)
          .filter(Boolean);
        const prefixPattern = prefixes.length > 0
          ? prefixes.join("-|") + "-"
          : "ao-";
        const cycleCmd =
          `cur=$(tmux display-message -p "#{session_name}"); ` +
          `sessions=$(tmux list-sessions -F "#{session_name}" | grep -E "^(${tuiSessionName}|${prefixPattern})" | tr "\\n" " "); ` +
          `set -- $sessions; ` +
          `found=0; first=""; ` +
          `for s; do ` +
          `  [ -z "$first" ] && first="$s"; ` +
          `  if [ "$found" = 1 ]; then tmux switch-client -t "$s"; exit 0; fi; ` +
          `  [ "$s" = "$cur" ] && found=1; ` +
          `done; ` +
          `[ -n "$first" ] && tmux switch-client -t "$first"`;
        try {
          execFileSync("tmux", ["bind-key", "-n", "BTab", "run-shell", cycleCmd], {
            timeout: 5_000,
          });
        } catch {
          // Non-fatal
        }

        const child = spawn("tmux", ["attach-session", "-t", tuiSessionName], {
          stdio: "inherit",
          detached: false,
        });
        child.on("error", (err) => {
          console.error(chalk.red("TUI failed to start:"), err.message);
          process.exit(1);
        });
        child.on("exit", (code) => {
          try {
            execFileSync("tmux", ["unbind-key", "-n", "BTab"], {
              timeout: 5_000,
              stdio: "ignore",
            });
          } catch {
            // tmux server may already be gone
          }
          process.exit(code ?? 0);
        });
        return;
      }
      const port = opts.port ? parseInt(opts.port, 10) : (config.port ?? 3000);

      if (isNaN(port) || port < 1 || port > 65535) {
        console.error(chalk.red("Invalid port number. Must be 1-65535."));
        process.exit(1);
      }

      const localWebDir = findWebDir();

      if (!existsSync(resolve(localWebDir, "package.json"))) {
        console.error(
          chalk.red(
            "Could not find @composio/ao-web package.\n" + "Ensure it is installed: pnpm install",
          ),
        );
        process.exit(1);
      }

      if (opts.rebuild) {
        // Check if a dashboard is already running on this port.
        const runningPid = await findRunningDashboardPid(port);
        const runningWebDir = runningPid ? await findProcessWebDir(runningPid) : null;
        const targetWebDir = runningWebDir ?? localWebDir;

        if (runningPid) {
          // Kill the running server, clean .next, then start fresh below.
          console.log(
            chalk.dim(`Stopping dashboard (PID ${runningPid}) on port ${port}...`),
          );
          try {
            process.kill(parseInt(runningPid, 10), "SIGTERM");
          } catch {
            // Process already exited (ESRCH) — that's fine
          }
          // Wait for port to be released
          await waitForPortFree(port, 5000);
        }

        await cleanNextCache(targetWebDir);
        // Fall through to start the dashboard on this port.
      }

      const webDir = localWebDir;

      console.log(chalk.bold(`Starting dashboard on http://localhost:${port}\n`));

      const env = await buildDashboardEnv(
        port,
        config.configPath,
        config.terminalPort,
        config.directTerminalPort,
      );

      const child = spawn("npx", ["next", "dev", "-p", String(port)], {
        cwd: webDir,
        stdio: ["inherit", "inherit", "pipe"],
        env,
      });

      const stderrChunks: string[] = [];

      const MAX_STDERR_CHUNKS = 100;

      child.stderr?.on("data", (data: Buffer) => {
        const text = data.toString();
        if (stderrChunks.length < MAX_STDERR_CHUNKS) {
          stderrChunks.push(text);
        }
        // Still show stderr to the user
        process.stderr.write(data);
      });

      child.on("error", (err) => {
        console.error(chalk.red("Could not start dashboard. Ensure Next.js is installed."));
        console.error(chalk.dim(String(err)));
        process.exit(1);
      });

      let openAbort: AbortController | undefined;

      if (opts.open !== false) {
        openAbort = new AbortController();
        void waitForPortAndOpen(port, `http://localhost:${port}`, openAbort.signal);
      }

      child.on("exit", (code) => {
        if (openAbort) openAbort.abort();

        if (code !== 0 && code !== null && !opts.rebuild) {
          const stderr = stderrChunks.join("");
          if (looksLikeStaleBuild(stderr)) {
            console.error(
              chalk.yellow(
                "\nThis looks like a stale build cache issue. Try:\n\n" +
                  `  ${chalk.cyan("ao dashboard --rebuild")}\n`,
              ),
            );
          }
        }

        process.exit(code ?? 0);
      });
    });
}

/**
 * Check if stderr output suggests stale build artifacts.
 */
function looksLikeStaleBuild(stderr: string): boolean {
  const patterns = [
    /Cannot find module.*vendor-chunks/,
    /Cannot find module.*\.next/,
    /Module not found.*\.next/,
    /ENOENT.*\.next/,
    /Could not find a production build/,
  ];
  return patterns.some((p) => p.test(stderr));
}
