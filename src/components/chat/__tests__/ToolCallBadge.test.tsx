import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(cleanup);

describe("getToolLabel", () => {
  test("str_replace_editor create", () => {
    expect(getToolLabel("str_replace_editor", { command: "create", path: "/src/App.jsx" })).toBe("Creating App.jsx");
  });

  test("str_replace_editor str_replace", () => {
    expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/Card.jsx" })).toBe("Editing Card.jsx");
  });

  test("str_replace_editor insert", () => {
    expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/index.tsx" })).toBe("Editing index.tsx");
  });

  test("str_replace_editor undo_edit", () => {
    expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/src/main.ts" })).toBe("Undoing edit to main.ts");
  });

  test("str_replace_editor view", () => {
    expect(getToolLabel("str_replace_editor", { command: "view", path: "/README.md" })).toBe("Viewing README.md");
  });

  test("file_manager rename", () => {
    expect(getToolLabel("file_manager", { command: "rename", path: "/src/old.tsx" })).toBe("Renaming old.tsx");
  });

  test("file_manager delete", () => {
    expect(getToolLabel("file_manager", { command: "delete", path: "/src/temp.js" })).toBe("Deleting temp.js");
  });

  test("unknown tool falls back to tool name", () => {
    expect(getToolLabel("some_other_tool", {})).toBe("some_other_tool");
  });
});

describe("ToolCallBadge", () => {
  function makeInvocation(overrides: Partial<ToolInvocation>): ToolInvocation {
    return {
      toolCallId: "1",
      toolName: "str_replace_editor",
      args: { command: "create", path: "/src/App.jsx" },
      state: "call",
      ...overrides,
    } as ToolInvocation;
  }

  test("loading state shows spinner and label", () => {
    render(<ToolCallBadge toolInvocation={makeInvocation({ state: "call" })} />);
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    // Loader2 renders an SVG; green dot is absent
    expect(document.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("done state shows green dot and label", () => {
    render(
      <ToolCallBadge
        toolInvocation={makeInvocation({ state: "result", result: "ok" } as Partial<ToolInvocation>)}
      />
    );
    expect(screen.getByText("Creating App.jsx")).toBeDefined();
    expect(document.querySelector(".bg-emerald-500")).toBeDefined();
  });

  test("result state with no result still shows spinner", () => {
    render(
      <ToolCallBadge
        toolInvocation={makeInvocation({ state: "result", result: undefined } as Partial<ToolInvocation>)}
      />
    );
    expect(document.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("renders label for file_manager delete", () => {
    render(
      <ToolCallBadge
        toolInvocation={makeInvocation({ toolName: "file_manager", args: { command: "delete", path: "/src/temp.js" }, state: "call" })}
      />
    );
    expect(screen.getByText("Deleting temp.js")).toBeDefined();
  });
});
