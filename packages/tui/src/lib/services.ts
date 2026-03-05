/**
 * Service initialization for the TUI.
 *
 * Mirrors packages/web/src/lib/services.ts but without Next.js specifics.
 * Lazily initializes config, plugin registry, and session manager.
 */

import {
  loadConfig,
  createPluginRegistry,
  createSessionManager,
  type OrchestratorConfig,
  type PluginRegistry,
  type SessionManager,
  type SCM,
  type ProjectConfig,
} from "@composio/ao-core";

// Static plugin imports
import pluginRuntimeTmux from "@composio/ao-plugin-runtime-tmux";
import pluginAgentClaudeCode from "@composio/ao-plugin-agent-claude-code";
import pluginWorkspaceWorktree from "@composio/ao-plugin-workspace-worktree";
import pluginScmGithub from "@composio/ao-plugin-scm-github";
import pluginTrackerGithub from "@composio/ao-plugin-tracker-github";
import pluginTrackerLinear from "@composio/ao-plugin-tracker-linear";

export interface Services {
  config: OrchestratorConfig;
  registry: PluginRegistry;
  sessionManager: SessionManager;
}

let cached: Services | undefined;

/** Get (or lazily initialize) the core services singleton. */
export function getServices(): Services {
  if (cached) return cached;

  const config = loadConfig();
  const registry = createPluginRegistry();

  registry.register(pluginRuntimeTmux);
  registry.register(pluginAgentClaudeCode);
  registry.register(pluginWorkspaceWorktree);
  registry.register(pluginScmGithub);
  registry.register(pluginTrackerGithub);
  registry.register(pluginTrackerLinear);

  const sessionManager = createSessionManager({ config, registry });

  cached = { config, registry, sessionManager };
  return cached;
}

/** Resolve the SCM plugin for a project. */
export function getSCM(registry: PluginRegistry, project: ProjectConfig | undefined): SCM | null {
  if (!project?.scm) return null;
  return registry.get<SCM>("scm", project.scm.plugin);
}
