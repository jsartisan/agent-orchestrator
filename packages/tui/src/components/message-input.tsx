import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface MessageInputProps {
  sessionId: string;
  onSubmit: (sessionId: string, message: string) => void;
  onCancel: () => void;
}

export function MessageInput({ sessionId, onSubmit, onCancel }: MessageInputProps) {
  const [value, setValue] = useState("");

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length > 0) {
      onSubmit(sessionId, trimmed);
    }
    onCancel();
  };

  return (
    <Box paddingX={1} flexDirection="column">
      <Text>
        Send message to{" "}
        <Text bold color="cyan">
          {sessionId}
        </Text>
        :
      </Text>
      <Box>
        <Text color="green">&gt; </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}
