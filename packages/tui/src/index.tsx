#!/usr/bin/env node

/**
 * @composio/ao-tui — Terminal UI dashboard for Agent Orchestrator
 *
 * Usage: ao-tui
 *   or:  npx @composio/ao-tui
 *   or:  pnpm dev (from packages/tui)
 */

import React from "react";
import { render } from "ink";
import { App } from "./app.js";

render(React.createElement(App));
