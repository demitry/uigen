import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// --- mocks ---

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// Typed handles for inline override per test
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignIn = vi.mocked(signInAction);
const mockSignUp = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// --- helpers ---

function renderUseAuth() {
  return renderHook(() => useAuth());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── isLoading ────────────────────────────────────────────────────────────────

describe("isLoading", () => {
  test("starts as false", () => {
    const { result } = renderUseAuth();
    expect(result.current.isLoading).toBe(false);
  });

  test("is true while signIn is in flight, false after it resolves", async () => {
    let resolveSignIn!: (v: { success: boolean }) => void;
    mockSignIn.mockReturnValue(
      new Promise((res) => {
        resolveSignIn = res;
      })
    );
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "proj-1" } as any);

    const { result } = renderUseAuth();

    // kick off — don't await yet
    act(() => {
      result.current.signIn("a@b.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("resets to false even when signIn throws", async () => {
    mockSignIn.mockRejectedValue(new Error("network error"));

    const { result } = renderUseAuth();

    await act(async () => {
      await expect(result.current.signIn("a@b.com", "pass")).rejects.toThrow();
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn", () => {
  test("returns the result from the server action on failure", async () => {
    const failure = { success: false, error: "Invalid credentials" };
    mockSignIn.mockResolvedValue(failure);

    const { result } = renderUseAuth();
    let returned: any;

    await act(async () => {
      returned = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returned).toEqual(failure);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("returns the result from the server action on success", async () => {
    const success = { success: true };
    mockSignIn.mockResolvedValue(success);
    mockGetAnonWorkData.mockReturnValue(null);
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "new-1" } as any);

    const { result } = renderUseAuth();
    let returned: any;

    await act(async () => {
      returned = await result.current.signIn("a@b.com", "password");
    });

    expect(returned).toEqual(success);
  });

  test("forwards email and password to the server action", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "err" });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("user@example.com", "s3cr3t!");
    });

    expect(mockSignIn).toHaveBeenCalledWith("user@example.com", "s3cr3t!");
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp", () => {
  test("returns the result from the server action on failure", async () => {
    const failure = { success: false, error: "Email already registered" };
    mockSignUp.mockResolvedValue(failure);

    const { result } = renderUseAuth();
    let returned: any;

    await act(async () => {
      returned = await result.current.signUp("a@b.com", "password1");
    });

    expect(returned).toEqual(failure);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false even when signUp throws", async () => {
    mockSignUp.mockRejectedValue(new Error("unexpected"));

    const { result } = renderUseAuth();

    await act(async () => {
      await expect(
        result.current.signUp("a@b.com", "password1")
      ).rejects.toThrow();
    });

    expect(result.current.isLoading).toBe(false);
  });
});

// ─── post-sign-in routing: anon work present ──────────────────────────────────

describe("handlePostSignIn — anonymous work present", () => {
  const anonWork = {
    messages: [{ id: "m1", role: "user", content: "hello" }],
    fileSystemData: { "/app.tsx": { type: "file", content: "code" } },
  };

  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(anonWork);
    mockCreateProject.mockResolvedValue({ id: "saved-anon" } as any);
  });

  test("creates a project with the anon messages and file system", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      })
    );
  });

  test("navigates to the new project", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockPush).toHaveBeenCalledWith("/saved-anon");
  });

  test("clears anon work after saving", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockClearAnonWork).toHaveBeenCalled();
  });

  test("does not call getProjects when anon work is present", async () => {
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
  });

  test("ignores anon data when messages array is empty", async () => {
    mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
    mockGetProjects.mockResolvedValue([{ id: "existing" }] as any);
    mockSignIn.mockResolvedValue({ success: true });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/existing");
  });
});

// ─── post-sign-in routing: no anon work ───────────────────────────────────────

describe("handlePostSignIn — no anonymous work", () => {
  beforeEach(() => {
    mockGetAnonWorkData.mockReturnValue(null);
  });

  test("navigates to the most recent project when projects exist", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([
      { id: "recent" },
      { id: "older" },
    ] as any);

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockPush).toHaveBeenCalledWith("/recent");
  });

  test("creates a new project and navigates to it when no projects exist", async () => {
    mockSignIn.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([]);
    mockCreateProject.mockResolvedValue({ id: "brand-new" } as any);

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "pw");
    });

    expect(mockCreateProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/brand-new");
  });

  test("same routing applies after successful signUp", async () => {
    mockSignUp.mockResolvedValue({ success: true });
    mockGetProjects.mockResolvedValue([{ id: "proj-after-signup" }] as any);

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signUp("new@user.com", "password1");
    });

    expect(mockPush).toHaveBeenCalledWith("/proj-after-signup");
  });

  test("does not navigate when sign-in fails", async () => {
    mockSignIn.mockResolvedValue({ success: false, error: "bad password" });

    const { result } = renderUseAuth();

    await act(async () => {
      await result.current.signIn("a@b.com", "wrong");
    });

    expect(mockGetProjects).not.toHaveBeenCalled();
    expect(mockCreateProject).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
