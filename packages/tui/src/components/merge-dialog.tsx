import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { MergeMethod } from "@composio/ao-core";
import type { DashboardPR } from "../lib/types.js";

export type { MergeMethod };

const METHODS: MergeMethod[] = ["squash", "merge", "rebase"];

interface MergeDialogProps {
  pr: DashboardPR;
  onConfirm: (method: MergeMethod) => void;
  onCancel: () => void;
}

export function MergeDialog({ pr, onConfirm, onCancel }: MergeDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<number>(0);

  useInput((input, key) => {
    if (input === "y" || input === "Y" || key.return) {
      onConfirm(METHODS[selectedMethod]);
      return;
    }
    if (input === "n" || input === "N" || key.escape) {
      onCancel();
      return;
    }
    if (key.leftArrow || input === "h") {
      setSelectedMethod((i) => (i - 1 + METHODS.length) % METHODS.length);
      return;
    }
    if (key.rightArrow || input === "l") {
      setSelectedMethod((i) => (i + 1) % METHODS.length);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} gap={1}>
      <Text>
        Merge PR <Text bold>#{pr.number}</Text> into{" "}
        <Text bold>{pr.baseBranch}</Text>?
      </Text>

      <Box gap={2}>
        <Text dimColor>Method:</Text>
        {METHODS.map((method, i) => (
          <Text key={method} bold={i === selectedMethod} color={i === selectedMethod ? "cyan" : undefined}>
            {i === selectedMethod ? "◉" : "○"} {method}
          </Text>
        ))}
      </Box>

      <Text dimColor>
        <Text bold>←/→</Text> change method{"  "}
        <Text bold>y/Enter</Text> confirm{"  "}
        <Text bold>n/Esc</Text> cancel
      </Text>
    </Box>
  );
}
