/**
 * Pure formatting utilities for the TUI.
 */

import type { DashboardSession, AttentionLevel } from "./types.js";

export function humanizeBranch(branch: string): string {
  const withoutPrefix = branch.replace(
    /^(?:feat|fix|chore|refactor|docs|test|ci|session|release|hotfix|feature|bugfix|build|wip|improvement)\//,
    "",
  );
  return withoutPrefix
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function getSessionTitle(session: DashboardSession): string {
  if (session.pr?.title) return session.pr.title;
  if (session.summary && !session.summaryIsFallback) {
    return session.summary;
  }
  if (session.issueTitle) return session.issueTitle;
  if (session.summary) return session.summary;
  if (session.branch) return humanizeBranch(session.branch);
  return session.status;
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function attentionLabel(level: AttentionLevel): string {
  const labels: Record<AttentionLevel, string> = {
    merge: "MERGE",
    respond: "RESPOND",
    review: "REVIEW",
    pending: "PENDING",
    working: "WORKING",
    done: "DONE",
  };
  return labels[level];
}

export function activityLabel(activity: string | null): string {
  if (!activity) return "unknown";
  return activity.replace(/_/g, " ");
}

export function ciLabel(ciStatus: string): string {
  const labels: Record<string, string> = {
    passing: "CI pass",
    failing: "CI fail",
    pending: "CI pending",
    none: "no CI",
  };
  return labels[ciStatus] ?? ciStatus;
}

export function prSizeLabel(additions: number, deletions: number): string {
  const total = additions + deletions;
  if (total <= 10) return "XS";
  if (total <= 50) return "S";
  if (total <= 200) return "M";
  if (total <= 500) return "L";
  return "XL";
}
