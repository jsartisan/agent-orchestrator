import React from "react";
import { Box, Text, useInput } from "ink";

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box paddingX={1}>
      <Text>
        {message}{" "}
        <Text bold color="yellow">
          [y/N]
        </Text>
      </Text>
    </Box>
  );
}
