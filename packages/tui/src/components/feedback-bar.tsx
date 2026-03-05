import React, { useEffect } from "react";
import { Box, Text } from "ink";

interface FeedbackBarProps {
  error: string | null;
  success: string | null;
  onClear: () => void;
}

export function FeedbackBar({ error, success, onClear }: FeedbackBarProps) {
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(onClear, 3_000);
      return () => clearTimeout(timer);
    }
  }, [error, success, onClear]);

  if (!error && !success) return null;

  return (
    <Box paddingX={1}>
      {error && <Text color="red">{error}</Text>}
      {success && <Text color="green">{success}</Text>}
    </Box>
  );
}
