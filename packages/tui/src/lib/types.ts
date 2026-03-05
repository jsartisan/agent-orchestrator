/**
 * TUI-specific types.
 *
 * Re-exports core types and defines dashboard session structures
 * matching the web dashboard for feature parity.
 */

export type {
  SessionStatus,
  ActivityState,
  CIStatus,
  ReviewDecision,
  MergeReadiness,
  PRState,
} from "@composio/ao-core/types";

import {
  ACTIVITY_STATE,
  SESSION_STATUS,
  CI_STATUS,
  TERMINAL_STATUSES,
  TERMINAL_ACTIVITIES,
  NON_RESTORABLE_STATUSES,
  type CICheck as CoreCICheck,
  type MergeReadiness,
  type CIStatus,
  type SessionStatus,
  type ActivityState,
} from "@composio/ao-core/types";

export {
  ACTIVITY_STATE,
  SESSION_STATUS,
  CI_STATUS,
  TERMINAL_STATUSES,
  TERMINAL_ACTIVITIES,
  NON_RESTORABLE_STATUSES,
};

export type AttentionLevel = "merge" | "respond" | "review" | "pending" | "working" | "done";

export interface DashboardSession {
  id: string;
  projectId: string;
  status: SessionStatus;
  activity: ActivityState | null;
  branch: string | null;
  issueId: string | null;
  issueUrl: string | null;
  issueLabel: string | null;
  issueTitle: string | null;
  summary: string | null;
  summaryIsFallback: boolean;
  createdAt: string;
  lastActivityAt: string;
  pr: DashboardPR | null;
  metadata: Record<string, string>;
}

export interface DashboardPR {
  number: number;
  url: string;
  title: string;
  owner: string;
  repo: string;
  branch: string;
  baseBranch: string;
  isDraft: boolean;
  state: "open" | "merged" | "closed";
  additions: number;
  deletions: number;
  ciStatus: CIStatus;
  ciChecks: DashboardCICheck[];
  reviewDecision: "none" | "pending" | "approved" | "changes_requested";
  mergeability: MergeReadiness;
  unresolvedThreads: number;
  unresolvedComments: DashboardUnresolvedComment[];
}

export interface DashboardCICheck {
  name: string;
  status: CoreCICheck["status"];
  url?: string;
}

export interface DashboardUnresolvedComment {
  url: string;
  path: string;
  author: string;
  body: string;
}

export interface DashboardStats {
  totalSessions: number;
  workingSessions: number;
  openPRs: number;
  needsReview: number;
}

export function isPRRateLimited(pr: DashboardPR): boolean {
  return pr.mergeability.blockers.includes("API rate limited or unavailable");
}

export function isPRMergeReady(pr: DashboardPR): boolean {
  return (
    pr.state === "open" &&
    pr.mergeability.mergeable &&
    pr.mergeability.ciPassing &&
    pr.mergeability.approved &&
    pr.mergeability.noConflicts
  );
}

export function getAttentionLevel(session: DashboardSession): AttentionLevel {
  if (
    session.status === "merged" ||
    session.status === "killed" ||
    session.status === "cleanup" ||
    session.status === "done" ||
    session.status === "terminated"
  ) {
    return "done";
  }
  if (session.pr) {
    if (session.pr.state === "merged" || session.pr.state === "closed") {
      return "done";
    }
  }

  if (session.status === "mergeable" || session.status === "approved") {
    return "merge";
  }
  if (session.pr?.mergeability.mergeable) {
    return "merge";
  }

  if (
    session.status === SESSION_STATUS.ERRORED ||
    session.status === SESSION_STATUS.NEEDS_INPUT ||
    session.status === SESSION_STATUS.STUCK
  ) {
    return "respond";
  }
  if (
    session.activity === ACTIVITY_STATE.WAITING_INPUT ||
    session.activity === ACTIVITY_STATE.BLOCKED
  ) {
    return "respond";
  }
  if (session.activity === ACTIVITY_STATE.EXITED) {
    return "respond";
  }

  if (session.status === "ci_failed" || session.status === "changes_requested") {
    return "review";
  }
  if (session.pr && !isPRRateLimited(session.pr)) {
    const pr = session.pr;
    if (pr.ciStatus === CI_STATUS.FAILING) return "review";
    if (pr.reviewDecision === "changes_requested") return "review";
    if (!pr.mergeability.noConflicts) return "review";
  }

  if (session.status === "review_pending") {
    return "pending";
  }
  if (session.pr && !isPRRateLimited(session.pr)) {
    const pr = session.pr;
    if (!pr.isDraft && pr.unresolvedThreads > 0) return "pending";
    if (!pr.isDraft && (pr.reviewDecision === "pending" || pr.reviewDecision === "none")) {
      return "pending";
    }
  }

  return "working";
}
