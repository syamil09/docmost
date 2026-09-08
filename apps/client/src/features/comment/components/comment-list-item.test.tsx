import { describe, it, expect, vi } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("@mantine/hooks", () => ({
  useHover: () => ({ hovered: false, ref: () => null }),
  useFocusWithin: () => ({ ref: () => null, focused: false }),
}));

vi.mock("@/features/comment/components/comment-editor", () => ({
  default: () => null,
}));

vi.mock("@/features/comment/queries/comment-query", () => ({
  useUpdateCommentMutation: () => ({ mutateAsync: vi.fn() }),
  useDeleteCommentMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/ee/hooks/use-feature", () => ({
  useHasFeature: () => false,
}));

vi.mock("@/ee/comment/queries/comment-query", () => ({
  useResolveCommentMutation: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/ee/comment/components/resolve-comment", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-time-ago", () => ({
  useTimeAgo: () => "2 hours ago",
}));

vi.mock("jotai", () => ({
  atom: () => ({}),
  useAtomValue: () => null,
  useAtom: () => [null, vi.fn()],
}));

vi.mock("@docmost/editor-ext", () => ({
  isEditorReady: () => false,
}));

vi.mock("@/components/ui/custom-avatar", () => ({
  CustomAvatar: () => null,
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import CommentListItem from "./comment-list-item";

const baseComment = {
  id: "c1",
  content: "{}",
  pageId: "foreign-id",
  creatorId: "u1",
  workspaceId: "w1",
  createdAt: new Date(),
  creator: { id: "u1", name: "syamil", avatarUrl: null } as any,
};

describe("CommentListItem source page link", () => {
  it("renders the source-page title as a link when comment is on a foreign page", () => {
    render(
      <MemoryRouter>
        <MantineProvider>
          <CommentListItem
            comment={{
              ...baseComment,
              page: {
                id: "foreign-id",
                slugId: "foreign",
                title: "Deployment Guide",
                icon: "",
                spaceId: "s1",
                spaceSlug: "general",
              },
            } as any}
            pageId="current-id"
            canComment={false}
          />
        </MantineProvider>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /deployment guide/i });
    expect(link.getAttribute("href")).toBe("/s/general/p/foreign");
  });
});
