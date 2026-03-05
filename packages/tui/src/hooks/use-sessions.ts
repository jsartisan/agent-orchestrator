/**
 * Hook that polls session data from the core services.
 *
 * Fetches sessions, enriches metadata + PR data, and returns
 * dashboard-ready session list with stats.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { type Session } from "@composio/ao-core";
import { getServices, getSCM } from "../lib/services.js";
import {
  sessionToDashboard,
  resolveProject,
  enrichSessionPR,
  enrichSessionsMetadata,
  computeStats,
} from "../lib/serialize.js";
import type { DashboardSession, DashboardStats } from "../lib/types.js";

const POLL_INTERVAL = 5_000;

export interface SessionsState {
  sessions: DashboardSession[];
  stats: DashboardStats;
  orchestratorId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSessions(): SessionsState {
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    workingSessions: 0,
    openPRs: 0,
    needsReview: 0,
  });
  const [orchestratorId, setOrchestratorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchSessions = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { config, registry, sessionManager } = getServices();
      const coreSessions = await sessionManager.list();

      const orchSession = coreSessions.find((s: Session) => s.id.endsWith("-orchestrator"));
      setOrchestratorId(orchSession ? orchSession.id : null);

      const workerSessions = coreSessions.filter((s: Session) => !s.id.endsWith("-orchestrator"));
      const dashboardSessions = workerSessions.map(sessionToDashboard);

      // Enrich metadata with 3s timeout
      const metaTimeout = new Promise<void>((resolve) => setTimeout(resolve, 3_000));
      await Promise.race([
        enrichSessionsMetadata(workerSessions, dashboardSessions, config, registry),
        metaTimeout,
      ]);

      // Enrich PRs with 4s timeout
      const enrichPromises = workerSessions.map((core: Session, i: number) => {
        if (!core.pr) return Promise.resolve();
        const project = resolveProject(core, config.projects);
        const scm = getSCM(registry, project);
        if (!scm) return Promise.resolve();
        return enrichSessionPR(dashboardSessions[i], scm, core.pr);
      });
      const enrichTimeout = new Promise<void>((resolve) => setTimeout(resolve, 4_000));
      await Promise.race([Promise.allSettled(enrichPromises), enrichTimeout]);

      setSessions(dashboardSessions);
      setStats(computeStats(dashboardSessions));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return {
    sessions,
    stats,
    orchestratorId,
    loading,
    error,
    refresh: fetchSessions,
  };
}
