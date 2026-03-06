import React from "react";
import { Box, Text } from "ink";

interface HelpBarProps {
  view: "list" | "detail" | "message";
  mergeAvailable?: boolean;
}

export function HelpBar({ view, mergeAvailable }: HelpBarProps) {
  if (view === "message") {
    return (
      <Box paddingX={1}>
        <Text dimColor>
          <Text bold>Enter</Text> send
          {"  "}
          <Text bold>Esc</Text> cancel
        </Text>
      </Box>
    );
  }

  if (view === "detail") {
    return (
      <Box paddingX={1}>
        <Text dimColor>
          <Text bold>Esc/q</Text> back
          {"  "}
          <Text bold>S-Tab</Text> cycle windows
          {"  "}
          <Text bold>t</Text> tmux
          {"  "}
          <Text bold>o</Text> orchestrator
          {"  "}
          <Text bold>m</Text> message
          {"  "}
          <Text bold>k</Text> kill
          {"  "}
          <Text bold>R</Text> restore
          {"  "}
          {mergeAvailable && (
            <>
              <Text bold color="green">M</Text>{" merge"}
              {"  "}
            </>
          )}
          <Text bold>r</Text> refresh
        </Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      <Text dimColor>
        <Text bold>j/k</Text> navigate
        {"  "}
        <Text bold>Enter</Text> details
        {"  "}
        <Text bold>S-Tab</Text> cycle windows
        {"  "}
        <Text bold>t</Text> tmux
        {"  "}
        <Text bold>o</Text> orchestrator
        {"  "}
        <Text bold>m</Text> message
        {"  "}
        <Text bold>K</Text> kill
        {"  "}
        <Text bold>R</Text> restore
        {"  "}
        {mergeAvailable && (
          <>
            <Text bold color="green">M</Text>{" merge"}
            {"  "}
          </>
        )}
        <Text bold>r</Text> refresh
        {"  "}
        <Text bold>q</Text> quit
      </Text>
    </Box>
  );
}
