import React from "react";
import { Box, Text } from "ink";
import {
  type DashboardSession,
  getAttentionLevel,
  isPRMergeReady,
  isPRRateLimited,
  TERMINAL_STATUSES,
} from "../lib/types.js";
import {
  getSessionTitle,
  relativeTime,
  attentionLabel,
  activityLabel,
  ciLabel,
  prSizeLabel,
} from "../lib/format.js";

interface SessionDetailProps {
  session: DashboardSession;
}

const ZONE_COLORS: Record<string, string> = {
  merge: "green",
  respond: "red",
  review: "#d18616",
  pending: "yellow",
  working: "blue",
  done: "gray",
};

export function SessionDetail({ session }: SessionDetailProps) {
  const level = getAttentionLevel(session);
  const pr = session.pr;
  const isTerminal = TERMINAL_STATUSES.has(session.status);
  const mergeReady = pr ? isPRMergeReady(pr) : false;
  const rateLimited = pr ? isPRRateLimited(pr) : false;

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      {/* Header */}
      <Box flexDirection="column">
        <Box gap={2}>
          <Text bold>{session.id}</Text>
          <Text color={ZONE_COLORS[level]} bold>
            [{attentionLabel(level)}]
          </Text>
          {mergeReady && (
            <Text color="green" bold>
              READY TO MERGE
            </Text>
          )}
          {isTerminal && <Text dimColor>(terminal)</Text>}
        </Box>
        <Text color="cyan">{getSessionTitle(session)}</Text>
      </Box>

      {/* Metadata */}
      <Box flexDirection="column">
        <Text dimColor bold>
          Session Info
        </Text>
        <Field label="Status" value={session.status} />
        <Field label="Activity" value={activityLabel(session.activity)} />
        <Field label="Project" value={session.projectId} />
        {session.branch && <Field label="Branch" value={session.branch} />}
        {session.issueUrl && (
          <Field
            label="Issue"
            value={
              session.issueLabel
                ? `${session.issueLabel}${session.issueTitle ? ` - ${session.issueTitle}` : ""}`
                : session.issueUrl
            }
          />
        )}
        <Field label="Created" value={relativeTime(session.createdAt)} />
        <Field label="Updated" value={relativeTime(session.lastActivityAt)} />
        {session.summary && (
          <Box>
            <Text dimColor> Summary: </Text>
            <Text>{session.summary}</Text>
          </Box>
        )}
      </Box>

      {/* PR Info */}
      {pr && (
        <Box flexDirection="column">
          <Text dimColor bold>
            Pull Request #{pr.number}
          </Text>
          <Field label="Title" value={pr.title} />
          <Field label="URL" value={pr.url} />
          <Field label="State" value={pr.state} />
          <Field
            label="Size"
            value={`+${pr.additions} -${pr.deletions} (${prSizeLabel(pr.additions, pr.deletions)})`}
          />
          {pr.isDraft && <Field label="Draft" value="yes" />}
          <Field label="Base" value={`${pr.baseBranch} <- ${pr.branch}`} />

          {rateLimited && <Text color="yellow"> PR data may be stale (rate limited)</Text>}

          {/* CI */}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor bold>
              CI Status
            </Text>
            <Field
              label="Overall"
              value={ciLabel(pr.ciStatus)}
              valueColor={
                pr.ciStatus === "passing"
                  ? "green"
                  : pr.ciStatus === "failing"
                    ? "red"
                    : pr.ciStatus === "pending"
                      ? "yellow"
                      : undefined
              }
            />
            {pr.ciChecks.length > 0 && (
              <Box flexDirection="column" marginLeft={2}>
                {pr.ciChecks.map((check) => (
                  <Box key={check.name} gap={1}>
                    <Text
                      color={
                        check.status === "passed"
                          ? "green"
                          : check.status === "failed"
                            ? "red"
                            : "yellow"
                      }
                    >
                      {check.status === "passed" ? "+" : check.status === "failed" ? "x" : "~"}
                    </Text>
                    <Text>{check.name}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Review */}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor bold>
              Review
            </Text>
            <Field
              label="Decision"
              value={pr.reviewDecision}
              valueColor={
                pr.reviewDecision === "approved"
                  ? "green"
                  : pr.reviewDecision === "changes_requested"
                    ? "red"
                    : pr.reviewDecision === "pending"
                      ? "yellow"
                      : undefined
              }
            />
            {pr.unresolvedThreads > 0 && (
              <Field
                label="Unresolved"
                value={`${pr.unresolvedThreads} comment${pr.unresolvedThreads > 1 ? "s" : ""}`}
                valueColor="red"
              />
            )}
            {pr.unresolvedComments.length > 0 && (
              <Box flexDirection="column" marginLeft={2}>
                {pr.unresolvedComments.map((c) => (
                  <Box key={c.url} flexDirection="column">
                    <Text dimColor>
                      {c.path} ({c.author})
                    </Text>
                    <Text> {c.body.slice(0, 120)}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Mergeability */}
          <Box marginTop={1} flexDirection="column">
            <Text dimColor bold>
              Merge Status
            </Text>
            <Field
              label="Mergeable"
              value={pr.mergeability.mergeable ? "yes" : "no"}
              valueColor={pr.mergeability.mergeable ? "green" : "red"}
            />
            <Field
              label="CI Passing"
              value={pr.mergeability.ciPassing ? "yes" : "no"}
              valueColor={pr.mergeability.ciPassing ? "green" : "red"}
            />
            <Field
              label="Approved"
              value={pr.mergeability.approved ? "yes" : "no"}
              valueColor={pr.mergeability.approved ? "green" : "red"}
            />
            <Field
              label="No Conflicts"
              value={pr.mergeability.noConflicts ? "yes" : "no"}
              valueColor={pr.mergeability.noConflicts ? "green" : "red"}
            />
            {pr.mergeability.blockers.length > 0 &&
              pr.mergeability.blockers[0] !== "Data not loaded" && (
                <Box flexDirection="column" marginLeft={2}>
                  {pr.mergeability.blockers.map((blocker: string, idx: number) => (
                    <Text key={idx} color="red">
                      - {blocker}
                    </Text>
                  ))}
                </Box>
              )}
          </Box>
        </Box>
      )}

      {!pr && <Text dimColor>No PR associated with this session.</Text>}
    </Box>
  );
}

interface FieldProps {
  label: string;
  value: string;
  valueColor?: string;
}

function Field({ label, value, valueColor }: FieldProps) {
  return (
    <Box>
      <Text dimColor> {label}: </Text>
      <Text color={valueColor}>{value}</Text>
    </Box>
  );
}
