/**
 * Core Session -> DashboardSession serialization for the TUI.
 *
 * Mirrors packages/web/src/lib/serialize.ts but without web-specific caching.
 */

import type {
  Session,
  Agent,
  SCM,
  PRInfo,
  Tracker,
  ProjectConfig,
  OrchestratorConfig,
  PluginRegistry,
  CICheck,
} from "@composio/ao-core";
import type { DashboardSession, DashboardPR, DashboardStats } from "./types.js";

export function resolveProject(
  core: Session,
  projects: Record<string, ProjectConfig>,
): ProjectConfig | undefined {
  const direct = projects[core.projectId];
  if (direct) return direct;
  const entry = Object.entries(projects).find(([, p]) => core.id.startsWith(p.sessionPrefix));
  if (entry) return entry[1];
  const firstKey = Object.keys(projects)[0];
  return firstKey ? projects[firstKey] : undefined;
}

export function sessionToDashboard(session: Session): DashboardSession {
  const agentSummary = session.agentInfo?.summary;
  const summary = agentSummary ?? session.metadata["summary"] ?? null;

  return {
    id: session.id,
    projectId: session.projectId,
    status: session.status,
    activity: session.activity,
    branch: session.branch,
    issueId: session.issueId,
    issueUrl: session.issueId,
    issueLabel: null,
    issueTitle: null,
    summary,
    summaryIsFallback: agentSummary ? (session.agentInfo?.summaryIsFallback ?? false) : false,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    pr: session.pr ? basicPRToDashboard(session.pr) : null,
    metadata: session.metadata,
  };
}

function basicPRToDashboard(pr: PRInfo): DashboardPR {
  return {
    number: pr.number,
    url: pr.url,
    title: pr.title,
    owner: pr.owner,
    repo: pr.repo,
    branch: pr.branch,
    baseBranch: pr.baseBranch,
    isDraft: pr.isDraft,
    state: "open",
    additions: 0,
    deletions: 0,
    ciStatus: "none",
    ciChecks: [],
    reviewDecision: "none",
    mergeability: {
      mergeable: false,
      ciPassing: false,
      approved: false,
      noConflicts: true,
      blockers: ["Data not loaded"],
    },
    unresolvedThreads: 0,
    unresolvedComments: [],
  };
}

export async function enrichSessionPR(
  dashboard: DashboardSession,
  scm: SCM,
  pr: PRInfo,
): Promise<void> {
  if (!dashboard.pr) return;

  const results = await Promise.allSettled([
    scm.getPRSummary
      ? scm.getPRSummary(pr)
      : scm.getPRState(pr).then((state: "open" | "merged" | "closed") => ({
          state,
          title: "",
          additions: 0,
          deletions: 0,
        })),
    scm.getCIChecks(pr),
    scm.getCISummary(pr),
    scm.getReviewDecision(pr),
    scm.getMergeability(pr),
    scm.getPendingComments(pr),
  ]);

  const [summaryR, checksR, ciR, reviewR, mergeR, commentsR] = results;

  if (summaryR.status === "fulfilled") {
    dashboard.pr.state = summaryR.value.state;
    dashboard.pr.additions = summaryR.value.additions;
    dashboard.pr.deletions = summaryR.value.deletions;
    if (summaryR.value.title) {
      dashboard.pr.title = summaryR.value.title;
    }
  }

  if (checksR.status === "fulfilled") {
    dashboard.pr.ciChecks = checksR.value.map((c: CICheck) => ({
      name: c.name,
      status: c.status,
      url: c.url,
    }));
  }

  if (ciR.status === "fulfilled") {
    dashboard.pr.ciStatus = ciR.value;
  }

  if (reviewR.status === "fulfilled") {
    dashboard.pr.reviewDecision = reviewR.value;
  }

  if (mergeR.status === "fulfilled") {
    dashboard.pr.mergeability = mergeR.value;
  } else {
    dashboard.pr.mergeability.blockers = ["Merge status unavailable"];
  }

  if (commentsR.status === "fulfilled") {
    const comments = commentsR.value;
    dashboard.pr.unresolvedThreads = comments.length;
    dashboard.pr.unresolvedComments = comments.map(
      (c: { url: string; path?: string; author: string; body: string }) => ({
        url: c.url,
        path: c.path ?? "",
        author: c.author,
        body: c.body,
      }),
    );
  }

  const failedCount = results.filter((r) => r.status === "rejected").length;
  if (
    failedCount >= results.length / 2 &&
    !dashboard.pr.mergeability.blockers.includes("API rate limited or unavailable")
  ) {
    dashboard.pr.mergeability.blockers.push("API rate limited or unavailable");
  }
}

export function enrichSessionIssue(
  dashboard: DashboardSession,
  tracker: Tracker,
  project: ProjectConfig,
): void {
  if (!dashboard.issueUrl) return;
  if (tracker.issueLabel) {
    try {
      dashboard.issueLabel = tracker.issueLabel(dashboard.issueUrl, project);
    } catch {
      const parts = dashboard.issueUrl.split("/");
      dashboard.issueLabel = parts[parts.length - 1] || dashboard.issueUrl;
    }
  } else {
    const parts = dashboard.issueUrl.split("/");
    dashboard.issueLabel = parts[parts.length - 1] || dashboard.issueUrl;
  }
}

export async function enrichSessionAgentSummary(
  dashboard: DashboardSession,
  coreSession: Session,
  agent: Agent,
): Promise<void> {
  if (dashboard.summary) return;
  try {
    const info = await agent.getSessionInfo(coreSession);
    if (info?.summary) {
      dashboard.summary = info.summary;
      dashboard.summaryIsFallback = info.summaryIsFallback ?? false;
    }
  } catch {
    // Can't read agent session info
  }
}

export async function enrichSessionsMetadata(
  coreSessions: Session[],
  dashboardSessions: DashboardSession[],
  config: OrchestratorConfig,
  registry: PluginRegistry,
): Promise<void> {
  const projects = coreSessions.map((core) => resolveProject(core, config.projects));

  projects.forEach((project, i) => {
    if (!dashboardSessions[i].issueUrl || !project?.tracker) return;
    const tracker = registry.get<Tracker>("tracker", project.tracker.plugin);
    if (!tracker) return;
    enrichSessionIssue(dashboardSessions[i], tracker, project);
  });

  const summaryPromises = coreSessions.map((core, i) => {
    if (dashboardSessions[i].summary) return Promise.resolve();
    const agentName = projects[i]?.agent ?? config.defaults.agent;
    if (!agentName) return Promise.resolve();
    const agent = registry.get<Agent>("agent", agentName);
    if (!agent) return Promise.resolve();
    return enrichSessionAgentSummary(dashboardSessions[i], core, agent);
  });

  await Promise.allSettled(summaryPromises);
}

export function computeStats(sessions: DashboardSession[]): DashboardStats {
  return {
    totalSessions: sessions.length,
    workingSessions: sessions.filter((s) => s.activity !== null && s.activity !== "exited").length,
    openPRs: sessions.filter((s) => s.pr?.state === "open").length,
    needsReview: sessions.filter((s) => s.pr && !s.pr.isDraft && s.pr.reviewDecision === "pending")
      .length,
  };
}
