import React from "react";
import { Box, Text } from "ink";
import { colors, VERSION } from "../lib/theme.js";

const e = React.createElement;

function getContextSafe() {
  try {
    // Lazy require to avoid circular deps and handle missing DB gracefully
    const { getContext } = require("../../lib/profile.js");
    return getContext();
  } catch {
    return null;
  }
}

function buildContextLine(ctx) {
  if (!ctx) return "Type a message or /help for commands.";

  const parts = [];

  // Today's observation count
  if (ctx.todayCount > 0) {
    parts.push(`${ctx.todayCount} observation${ctx.todayCount !== 1 ? "s" : ""} today`);
  }

  // Active ticket tags from recent observations
  const ticketTags = new Set();
  if (ctx.recentObs && ctx.recentObs.length > 0) {
    for (const obs of ctx.recentObs) {
      if (obs.tags) {
        for (const tag of obs.tags) {
          if (/^(PORT|AD|MMA|DLV)-\d+$/.test(tag)) {
            ticketTags.add(tag);
          }
        }
      }
    }
  }

  if (ticketTags.size > 0) {
    const sorted = [...ticketTags].sort();
    parts.push(`active: ${sorted.join(", ")}`);
  }

  if (parts.length === 0) return "Type a message or /help for commands.";
  return parts.join(" · ") + " · /help for commands";
}

export function Banner() {
  const ctx = getContextSafe();
  const greeting = ctx?.greeting || "Hello";
  const contextLine = buildContextLine(ctx);

  return e(Box, { flexDirection: "column", marginBottom: 1 },
    e(Box, null,
      e(Text, { color: colors.cyan, bold: true }, "engie"),
      e(Text, { color: colors.gray }, ` v${VERSION}`)
    ),
    e(Text, { color: colors.grayDim }, `${greeting}. ${contextLine}`)
  );
}
