import { useCallback } from "react";

let sysMsgCounter = 0;

const HELP_TEXT = [
  "Available commands:",
  "  /help       Show this help",
  "  /clear      Clear message history",
  "  /session    Show current session key",
  "  /status     Show service health",
  "  /quit       Exit (/exit, /q also work)",
].join("\n");

/**
 * Slash command handler hook.
 *
 * Returns { handleCommand(text) -> bool } — returns true if the input was a slash command.
 */
export function useSlashCommands({ gateway, app, setMessages, setStreamText, sendMessage, sessionKey, services }) {
  const handleCommand = useCallback(
    (text) => {
      const cmd = text.trim().toLowerCase();

      if (!cmd.startsWith("/")) return false;

      // /quit, /exit, /q
      if (cmd === "/quit" || cmd === "/exit" || cmd === "/q") {
        gateway.disconnect();
        app.exit();
        return true;
      }

      // /clear
      if (cmd === "/clear") {
        setMessages([]);
        setStreamText("");
        return true;
      }

      // /session
      if (cmd === "/session") {
        setMessages((prev) => [
          ...prev,
          { id: `sys-${++sysMsgCounter}`, role: "system", text: `Session: ${sessionKey}` },
        ]);
        return true;
      }

      // /help
      if (cmd === "/help") {
        setMessages((prev) => [
          ...prev,
          { id: `sys-${++sysMsgCounter}`, role: "system", text: HELP_TEXT },
        ]);
        return true;
      }

      // /status
      if (cmd === "/status") {
        const lines = services.map((s) => {
          const dot = s.healthy ? "\u25CF" : "\u25CB";
          const status = s.healthy ? "healthy" : "down";
          return `  ${dot} ${s.name}: ${status}`;
        });
        setMessages((prev) => [
          ...prev,
          { id: `sys-${++sysMsgCounter}`, role: "system", text: `Service health:\n${lines.join("\n")}` },
        ]);
        return true;
      }

      // Unknown slash command
      setMessages((prev) => [
        ...prev,
        { id: `sys-${++sysMsgCounter}`, role: "system", text: `Unknown command: ${cmd}. Type /help for available commands.` },
      ]);
      return true;
    },
    [gateway, app, setMessages, setStreamText, sendMessage, sessionKey, services]
  );

  return { handleCommand };
}
