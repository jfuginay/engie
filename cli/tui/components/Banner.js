import React from "react";
import { Box, Text } from "ink";
import { colors, VERSION, getGreetingTime } from "../lib/theme.js";
import { readFileSync } from "fs";
import { join } from "path";
import { userInfo } from "os";

const e = React.createElement;

function getUserName() {
  // Try ~/.engie/profile/user.json
  try {
    const home = process.env.HOME || "/tmp";
    const profilePath = join(home, ".engie", "profile", "user.json");
    const profile = JSON.parse(readFileSync(profilePath, "utf8"));
    if (profile.name) return profile.name;
  } catch {
    // fall through
  }
  // Fall back to OS username
  try {
    const info = userInfo();
    // Capitalize first letter
    const name = info.username;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return null;
  }
}

export function Banner() {
  const timeGreeting = getGreetingTime();
  const userName = getUserName();

  const greeting = userName
    ? `${timeGreeting}, ${userName}. Type a message or /help for commands.`
    : `${timeGreeting}. Type a message or /help for commands.`;

  return e(Box, { flexDirection: "column", marginBottom: 1 },
    e(Box, null,
      e(Text, { color: colors.cyan, bold: true }, "engie"),
      e(Text, { color: colors.gray }, ` v${VERSION}`)
    ),
    e(Text, { color: colors.grayDim }, greeting)
  );
}
