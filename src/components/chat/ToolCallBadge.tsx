import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = typeof args?.path === "string"
    ? args.path.split("/").pop() ?? args.path
    : undefined;

  if (toolName === "str_replace_editor" && filename) {
    switch (args.command) {
      case "create":    return `Creating ${filename}`;
      case "str_replace":
      case "insert":    return `Editing ${filename}`;
      case "undo_edit": return `Undoing edit to ${filename}`;
      case "view":      return `Viewing ${filename}`;
    }
  }

  if (toolName === "file_manager" && filename) {
    switch (args.command) {
      case "rename": return `Renaming ${filename}`;
      case "delete": return `Deleting ${filename}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const label = getToolLabel(
    toolInvocation.toolName,
    (toolInvocation.args ?? {}) as Record<string, unknown>
  );
  const done = toolInvocation.state === "result" && (toolInvocation as { result?: unknown }).result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
