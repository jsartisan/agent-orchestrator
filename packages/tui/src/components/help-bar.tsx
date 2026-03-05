import React from "react";
import { Box, Text } from "ink";

interface HelpBarProps {
  view: "list" | "detail" | "message";
}

export function HelpBar({ view }: HelpBarProps) {
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
          <Text bold>^B Tab</Text> cycle windows
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
        <Text bold>^B Tab</Text> cycle windows
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
        <Text bold>r</Text> refresh
        {"  "}
        <Text bold>q</Text> quit
      </Text>
    </Box>
  );
}
