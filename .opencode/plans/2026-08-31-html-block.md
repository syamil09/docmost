# HTML Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Notion-like "HTML Block" to Docmost's editor — users can write/paste HTML code directly or upload an `.html` file, and see a live rendered preview inside a sandboxed iframe.

**Architecture:** A new `HtmlBlock` Tiptap node (atom, draggable) stores raw HTML in a `code` attribute. The React node view renders a code textarea + iframe preview. The block is registered in the client editor, the server collaboration schema, and the DOCX serializer. File upload reads the file client-side with FileReader (no server upload needed); the content is stored directly in the document.

**Tech Stack:** Tiptap 3.29.2 (Node extension), React, Mantine UI, @tabler/icons-react, DOMPurify, ResizableWrapper (existing), Vitest (client), Jest (server).

## Global Constraints

- Node type name: `htmlBlock` (unique, lowercase — Tiptap convention)
- Attrs: `code` (string), `title` (string|null), `width` (number), `height` (number)
- File upload cap: 512 KB (enforced client-side)
- Sandboxed iframe: `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"`
- Server collaboration schema must include the node (otherwise real-time collab crashes on unknown node type)
- DOCX serializer must handle the node (otherwise export throws `Token type 'htmlBlock' not supported`)
- All existing test commands unchanged: `pnpm --filter ./apps/server test`, `pnpm --filter ./apps/client test`

---

## File Structure

```
packages/editor-ext/src/lib/html-block/
  html-block.ts       — Tiptap Node definition
  index.ts           — barrel export

apps/client/src/features/editor/components/html-block/
  html-block-view.tsx       — React node view (code editor + iframe preview)
  html-block.module.css     — styles
  html-block.utils.ts       — pure helpers (readHtmlFile, buildSrcdoc)
  html-block.test.ts        — vitest unit tests

apps/server/src/
  collaboration/collaboration.util.ts  — register node in tiptapExtensions

packages/editor-ext/src/lib/prosemirror-docx/schema.ts  — add DOCX serializer

apps/client/src/features/editor/extensions/
  extensions.ts               — import HtmlBlock, register with nodeView

apps/client/src/features/editor/components/slash-menu/menu-items.ts
  — add "HTML block" slash command item

apps/client/src/features/editor/components/fixed-toolbar/groups/
  more-inserts-group.tsx      — add "HTML block" toolbar menu item

apps/client/public/locales/en-US/translation.json
  — add i18n keys

apps/server/src/core/page/transclusion/spec/
  html-block-schema.spec.ts   — jest round-trip tests (server)
```

---

## Task 1: Create Branch

**Files:** None — git operation only.

- [ ] **Step 1: Create and switch to feat/embed-html branch**

```bash
git checkout -b feat/embed-html
```

---

## Task 2: Tiptap Node — html-block.ts

**Files:**
- Create: `packages/editor-ext/src/lib/html-block/html-block.ts`
- Create: `packages/editor-ext/src/lib/html-block/index.ts`
- Modify: `packages/editor-ext/src/index.ts`

**Interfaces:**
- Produces: `HtmlBlock` Node extension, `HtmlBlockOptions`, `HtmlBlockAttributes`

- [ ] **Step 1: Create the extension file**

```ts
// packages/editor-ext/src/lib/html-block/html-block.ts
import { Node, mergeAttributes } from "@tiptap/core";
import { EditorState, NodeSelection, Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

export interface HtmlBlockOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

export interface HtmlBlockAttributes {
  code?: string;
  title?: string | null;
  width?: number;
  height?: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlBlock: {
      insertHtmlBlock: (attrs?: Partial<HtmlBlockAttributes>) => ReturnType;
    };
  }
}

export const HtmlBlock = Node.create<HtmlBlockOptions>({
  name: "htmlBlock",

  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      view: null,
    };
  },

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-code") ??
          (element as HTMLElement)
            .querySelector("pre")
            ?.textContent?.replace(/\n$/, "") ??
          "",
        renderHTML: (attributes) =>
          attributes.code ? { "data-code": attributes.code } : {},
      },
      title: {
        default: null,
        parseHTML: (element) =>
          (element as HTMLElement).getAttribute("data-title"),
        renderHTML: (attributes) =>
          attributes.title ? { "data-title": attributes.title } : {},
      },
      width: {
        default: 800,
        parseHTML: (element) =>
          Number(
            (element as HTMLElement).getAttribute("data-width") || 800,
          ),
        renderHTML: (attributes) => ({
          "data-width": String(attributes.width ?? 800),
        }),
      },
      height: {
        default: 500,
        parseHTML: (element) =>
          Number(
            (element as HTMLElement).getAttribute("data-height") || 500,
          ),
        renderHTML: (attributes) => ({
          "data-height": String(attributes.height ?? 500),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="htmlBlock"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const code = String(HTMLAttributes["data-code"] ?? "");
    return [
      "div",
      mergeAttributes(
        { "data-type": this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      ["pre", { "aria-label": "html-block-source" }, code],
    ];
  },

  addCommands() {
    return {
      insertHtmlBlock:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              code: "",
              title: null,
              width: 800,
              height: 500,
              ...attrs,
            },
          }),
    };
  },

  addKeyboardShortcuts() {
    const isThisNodeSelected = (): boolean => {
      const { selection } = this.editor.state;
      return (
        selection instanceof NodeSelection &&
        selection.node.type.name === this.name
      );
    };
    return {
      Backspace: () => isThisNodeSelected(),
      Delete: () => isThisNodeSelected(),
    };
  },

  addProseMirrorPlugins() {
    const nodeName = this.name;
    const isThisNodeSelected = (state: EditorState): boolean => {
      const { selection } = state;
      return (
        selection instanceof NodeSelection &&
        selection.node.type.name === nodeName
      );
    };
    return [
      new Plugin({
        props: {
          handleTextInput: (view) => isThisNodeSelected(view.state),
          handlePaste: (view) => isThisNodeSelected(view.state),
        },
      }),
    ];
  },

  addNodeView() {
    this.editor.isInitialized = true;
    return ReactNodeViewRenderer(this.options.view);
  },
});
```

- [ ] **Step 2: Create the barrel export**

```ts
// packages/editor-ext/src/lib/html-block/index.ts
export { HtmlBlock } from "./html-block";
export type { HtmlBlockOptions, HtmlBlockAttributes } from "./html-block";
```

- [ ] **Step 3: Export from editor-ext main index**

Add to `packages/editor-ext/src/index.ts`, before the closing `}`:

```ts
export * from "./lib/html-block";
```

- [ ] **Step 4: Build editor-ext**

```bash
cd packages/editor-ext && pnpm build
```

Expected: compiles without errors.

---

## Task 3: Client Utils, CSS & Tests

**Files:**
- Create: `apps/client/src/features/editor/components/html-block/html-block.utils.ts`
- Create: `apps/client/src/features/editor/components/html-block/html-block.module.css`
- Create: `apps/client/src/features/editor/components/html-block/html-block.test.ts`

**Interfaces:**
- `readHtmlFile(file: File): Promise<string>`
- `buildSrcdoc(code: string): string`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/client/src/features/editor/components/html-block/html-block.test.ts
import { describe, it, expect } from "vitest";
import { readHtmlFile, buildSrcdoc, MAX_HTML_FILE_SIZE } from "./html-block.utils";

describe("readHtmlFile", () => {
  it("reads file content as string", async () => {
    const file = new File(["<p>hello</p>"], "test.html", { type: "text/html" });
    const result = await readHtmlFile(file);
    expect(result).toBe("<p>hello</p>");
  });

  it("reads unicode content", async () => {
    const file = new File(["<p>こんにちは</p>"], "test.html", { type: "text/html" });
    const result = await readHtmlFile(file);
    expect(result).toBe("<p>こんにちは</p>");
  });
});

describe("buildSrcdoc", () => {
  it("wraps code in full HTML document", () => {
    const result = buildSrcdoc("<b>test</b>");
    expect(result).toContain("<b>test</b>");
    expect(result).toContain("<!doctype html>");
    expect(result).toContain('<meta charset="utf-8">');
  });

  it("keeps code as-is for srcdoc rendering", () => {
    const code = "<script>alert(1)</script>";
    const result = buildSrcdoc(code);
    expect(result).toContain("<script>alert(1)</script>");
  });
});

describe("MAX_HTML_FILE_SIZE", () => {
  it("is 512KB", () => {
    expect(MAX_HTML_FILE_SIZE).toBe(512 * 1024);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm --filter ./apps/client test -- --run src/features/editor/components/html-block/html-block.test.ts
```

Expected: FAIL (file doesn't exist)

- [ ] **Step 3: Implement utils**

```ts
// apps/client/src/features/editor/components/html-block/html-block.utils.ts
export const MAX_HTML_FILE_SIZE = 512 * 1024; // 512 KB

export function readHtmlFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function buildSrcdoc(code: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: auto; background: #fff; }
    html::-webkit-scrollbar { width: 6px; height: 6px; }
    html::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
  </style>
</head>
<body>${code}</body>
</html>`;
}
```

- [ ] **Step 4: Implement CSS module**

```css
/* apps/client/src/features/editor/components/html-block/html-block.module.css */

.wrapper {
  border: 1px solid var(--mantine-color-gray-3, #dee2e6);
  border-radius: 8px;
  overflow: hidden;
  background: var(--mantine-color-body, #fff);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--mantine-color-gray-3, #dee2e6);
  background: var(--mantine-color-gray-0, #f8f9fa);
  content-editable: false;
  user-select: none;
}

.toolbarSpacer {
  flex: 1;
}

.sourceArea {
  width: 100%;
  min-height: 80px;
  padding: 10px 12px;
  border: none;
  outline: none;
  resize: vertical;
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  background: var(--mantine-color-gray-0, #f8f9fa);
  color: var(--mantine-color-dark-7, #212529);
  box-sizing: border-box;
  tab-size: 2;
}

.sourceArea::placeholder {
  color: var(--mantine-color-gray-5, #adb5bd);
}

.iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  color: var(--mantine-color-dimmed, #868e96);
  font-size: 14px;
  text-align: center;
}

.placeholderText {
  color: var(--mantine-color-dimmed, #868e96);
  font-size: 13px;
}

.preview {
  width: 100%;
  height: 100%;
  overflow: auto;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter ./apps/client test -- --run src/features/editor/components/html-block/html-block.test.ts
```

Expected: PASS

---

## Task 4: React Node View

**Files:**
- Create: `apps/client/src/features/editor/components/html-block/html-block-view.tsx`

**Interfaces:**
- Consumes: `HtmlBlock` node, `updateAttributes`, `editor`, `selected`, `deleteNode` from NodeViewProps
- Uses: `ResizableWrapper`, `buildSrcdoc`, `readHtmlFile`, `MAX_HTML_FILE_SIZE`

- [ ] **Step 1: Implement the node view**

```tsx
// apps/client/src/features/editor/components/html-block/html-block-view.tsx
import { NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import { ActionIcon, Button, Text, Tooltip } from "@mantine/core";
import { IconFileUpload, IconCode, IconEye, IconX } from "@tabler/icons-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import {
  buildSrcdoc,
  readHtmlFile,
  MAX_HTML_FILE_SIZE,
} from "./html-block.utils";
import { ResizableWrapper } from "../common/resizable-wrapper";
import classes from "./html-block.module.css";

export default function HtmlBlockView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { node, updateAttributes, editor, selected, deleteNode } = props;
  const { code = "", title = null, width = 800, height = 500 } = node.attrs;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [internalCode, setInternalCode] = useState(code);

  const isEditable = editor.isEditable;
  const isSelected = selected;

  useEffect(() => {
    setInternalCode(code);
  }, [code]);

  useEffect(() => {
    if (!isSelected && editing) {
      setEditing(false);
    }
  }, [isSelected, editing]);

  const showEditor = isEditable && (editing || isSelected);
  const hasCode = internalCode.trim().length > 0;

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInternalCode(value);
      updateAttributes({ code: value });
    },
    [updateAttributes],
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_HTML_FILE_SIZE) {
      notifications.show({
        message: t("File too large. Maximum size is 512KB."),
        color: "red",
        position: "top-right",
      });
      return;
    }
    try {
      const content = await readHtmlFile(file);
      setInternalCode(content);
      updateAttributes({ code: content, title: file.name });
    } catch {
      notifications.show({
        message: t("Failed to read file."),
        color: "red",
        position: "top-right",
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleResize = useCallback(
    (w: number, h: number) => {
      updateAttributes({ width: w, height: h });
    },
    [updateAttributes],
  );

  return (
    <NodeViewWrapper data-drag-handle>
      <div className={classes.wrapper}>
        {isEditable && (
          <div
            className={classes.toolbar}
            contentEditable={false}
            onMouseDown={(e) => e.preventDefault()}
          >
            <Tooltip label={t("Upload HTML file")} withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={handleUploadClick}
                aria-label={t("Upload HTML file")}
              >
                <IconFileUpload size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t("Edit code")} withArrow>
              <ActionIcon
                variant={editing ? "filled" : "subtle"}
                size="sm"
                color={editing ? "blue" : "gray"}
                onClick={() => setEditing((v) => !v)}
                aria-label={t("Edit code")}
              >
                <IconCode size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t("Preview")} withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => setEditing(false)}
                aria-label={t("Preview")}
              >
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>

            <div className={classes.toolbarSpacer} />

            {title && (
              <Text size="xs" c="dimmed">
                {title}
              </Text>
            )}

            <Tooltip label={t("Remove")} withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                color="red"
                onClick={() => deleteNode()}
                aria-label={t("Remove")}
              >
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}

        {showEditor && (
          <textarea
            className={classes.sourceArea}
            value={internalCode}
            onChange={handleCodeChange}
            placeholder={t("Write or paste HTML code here...")}
            spellCheck={false}
            rows={Math.max(4, internalCode.split("\n").length)}
          />
        )}

        <ResizableWrapper
          initialWidth={width}
          initialHeight={height}
          minWidth={240}
          maxWidth={1200}
          minHeight={120}
          maxHeight={1200}
          isEditable={false}
          selected={isSelected}
          className={classes.preview}
          onResize={handleResize}
        >
          {hasCode ? (
            <iframe
              className={classes.iframe}
              srcDoc={buildSrcdoc(internalCode)}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads allow-modals"
              title={title ?? "HTML block preview"}
              loading="lazy"
            />
          ) : (
            <div className={classes.placeholder}>
              <IconFileUpload size={32} strokeWidth={1.5} />
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  if (!isEditable) return;
                  setEditing(true);
                  handleUploadClick();
                }}
              >
                {t("Upload HTML file")}
              </Button>
              <Text className={classes.placeholderText}>
                {t("Or click 'Edit code' to write HTML directly")}
              </Text>
            </div>
          )}
        </ResizableWrapper>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,text/html"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </NodeViewWrapper>
  );
}
```

---

## Task 5: Register in Client Extensions

**Files:**
- Modify: `apps/client/src/features/editor/extensions/extensions.ts`

- [ ] **Step 1: Import HtmlBlock and view**

After the existing editor-ext imports:

```ts
import { HtmlBlock } from "@docmost/editor-ext";
import HtmlBlockView from "@/features/editor/components/html-block/html-block-view.tsx";
```

- [ ] **Step 2: Add to mainExtensions array**

After the `BaseEmbedNode.extend({ ... })` entry (around line 403):

```ts
  HtmlBlock.configure({
    addNodeView() {
      return ReactNodeViewRenderer(HtmlBlockView);
    },
  }),
```

- [ ] **Step 3: Add htmlBlock to GlobalDragHandle atomNodes**

Find the `GlobalDragHandle.configure({ ... })` block and change:

```ts
  GlobalDragHandle.configure({
    customNodes: ["transclusionSource", "transclusionReference"],
    atomNodes: ["base", "htmlBlock"],
  }),
```

---

## Task 6: Slash Menu Item

**Files:**
- Modify: `apps/client/src/features/editor/components/slash-menu/menu-items.ts`
- Modify: `apps/client/public/locales/en-US/translation.json`

- [ ] **Step 1: Add import**

```ts
import { IconBrandHtml5 } from "@tabler/icons-react";
```

- [ ] **Step 2: Add item after "Code" (line ~164)**

```ts
    {
      title: "HTML block",
      description: "Embed custom HTML — write code or upload a file.",
      searchTerms: ["html", "embed", "component", "widget", "iframe", "custom"],
      icon: IconBrandHtml5,
      command: ({ editor, range }: CommandProps) =>
        editor.chain().focus().deleteRange(range).insertHtmlBlock().run(),
    },
```

- [ ] **Step 3: Add i18n keys to en-US/translation.json**

Add these keys (find the line with `"Embed link":` and add nearby):

```json
  "HTML block": "HTML block",
  "Embed custom HTML — write code or upload a file.": "Embed custom HTML — write code or upload a file.",
  "Upload HTML file": "Upload HTML file",
  "Edit code": "Edit code",
  "Preview": "Preview",
  "Remove": "Remove",
  "Write or paste HTML code here...": "Write or paste HTML code here...",
  "Or click 'Edit code' to write HTML directly": "Or click 'Edit code' to write HTML directly",
  "File too large. Maximum size is 512KB.": "File too large. Maximum size is 512KB.",
  "Failed to read file.": "Failed to read file.",
```

---

## Task 7: Toolbar Menu Item

**Files:**
- Modify: `apps/client/src/features/editor/components/fixed-toolbar/groups/more-inserts-group.tsx`

- [ ] **Step 1: Add import**

```ts
import { IconBrandHtml5 } from "@tabler/icons-react";
```

- [ ] **Step 2: Add HTML block item in Embeds section**

Add before the final `Menu.Divider` at the bottom of the Embeds group (after Google Sheets item):

```tsx
        <Menu.Item
          leftSection={<IconBrandHtml5 size={16} />}
          onClick={() =>
            editor.chain().focus().insertHtmlBlock().run()
          }
        >
          {t("HTML block")}
        </Menu.Item>
```

---

## Task 8: Server Collaboration Schema Registration

**Files:**
- Modify: `apps/server/src/collaboration/collaboration.util.ts`
- Create: `apps/server/src/core/page/transclusion/spec/html-block-schema.spec.ts`

- [ ] **Step 1: Import HtmlBlock**

Add to the `@docmost/editor-ext` import block (after `BaseEmbed`):

```ts
  HtmlBlock,
```

- [ ] **Step 2: Add to tiptapExtensions array**

Add before the closing `]` of the array:

```ts
  HtmlBlock,
```

- [ ] **Step 3: Write server-side round-trip tests**

```ts
// apps/server/src/core/page/transclusion/spec/html-block-schema.spec.ts
import { generateJSON, generateHTML } from "@tiptap/html";
import { addUniqueIdsToDoc, HtmlBlock } from "@docmost/editor-ext";
import { extensions as coreExtensions } from "@tiptap/core";

const tiptapExtensions = [
  ...coreExtensions,
  HtmlBlock,
] as any;

describe("HtmlBlock schema", () => {
  it("generates JSON from HTML with data-code attribute", () => {
    const html = `<div data-type="htmlBlock" data-code="&lt;b&gt;hello&lt;/b&gt;" data-width="800" data-height="500"></div>`;
    const json = generateJSON(html, tiptapExtensions);
    const withIds = addUniqueIdsToDoc(json, tiptapExtensions);
    expect(withIds.content?.[0]?.type).toBe("htmlBlock");
    expect(withIds.content?.[0]?.attrs?.code).toBe("<b>hello</b>");
    expect(withIds.content?.[0]?.attrs?.width).toBe(800);
    expect(withIds.content?.[0]?.attrs?.height).toBe(500);
  });

  it("round-trips code through generateHTML then generateJSON", () => {
    const originalJson = {
      type: "doc",
      attrs: { uniqueId: "test" },
      content: [
        {
          type: "htmlBlock",
          attrs: {
            code: '<p style="color:red">test</p>',
            title: null,
            width: 640,
            height: 480,
          },
        },
      ],
    };
    const html = generateHTML(originalJson, tiptapExtensions);
    const reparsed = generateJSON(html, tiptapExtensions);
    const reparsedCode = reparsed.content?.[0]?.attrs?.code ?? "";
    expect(reparsedCode).toBe('<p style="color:red">test</p>');
  });

  it("preserves unicode in code attribute", () => {
    const originalJson = {
      type: "doc",
      attrs: { uniqueId: "test" },
      content: [
        {
          type: "htmlBlock",
          attrs: { code: "你好", title: null, width: 800, height: 500 },
        },
      ],
    };
    const html = generateHTML(originalJson, tiptapExtensions);
    const reparsed = generateJSON(html, tiptapExtensions);
    expect(reparsed.content?.[0]?.attrs?.code).toBe("你好");
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter ./apps/server test -- --testPathPattern="html-block-schema"
```

Expected: PASS

---

## Task 9: DOCX Export Serializer

**Files:**
- Modify: `packages/editor-ext/src/lib/prosemirror-docx/schema.ts`

- [ ] **Step 1: Add htmlBlock handler to defaultAsyncNodes**

Find `base() {}` (line ~195) in `defaultAsyncNodes` and add before `};`:

```ts
  htmlBlock(state, node) {
    const code = node.attrs?.code ?? "";
    if (code) {
      state.text(`[HTML]: ${code.replace(/\n/g, " ")}`);
    }
    state.closeBlock(node);
  },
```

- [ ] **Step 2: Build editor-ext**

```bash
cd packages/editor-ext && pnpm build
```

Expected: compiles without errors.

---

## Task 10: Verify Full Integration

- [ ] **Step 1: Run all server tests**

```bash
pnpm --filter ./apps/server test
```

Expected: all pass.

- [ ] **Step 2: Run all client tests**

```bash
pnpm --filter ./apps/client test -- --run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(editor): add HTML block — write/upload code, iframe preview"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Upload HTML file → FileReader reads .html file, stores in `code` attr
- [x] Write HTML code directly → textarea editor in node view
- [x] Render it → sandboxed iframe with `srcDoc`
- [x] Notion-like look → block with toolbar, textarea + preview split
- [x] Slash menu → `/html` command inserts block
- [x] Toolbar → More Inserts → HTML block
- [x] Server collab → HtmlBlock in tiptapExtensions
- [x] DOCX export → htmlBlock serializer handler
- [x] Read-only preview → works (editor.isEditable=false hides toolbar)
- [x] 512KB file cap → enforced client-side with notification
- [x] Resizable → ResizableWrapper with width/height attrs
- [x] i18n → keys added to en-US

**Placeholder scan:** No "TBD", "TODO", or incomplete steps. All code shown inline.

**Type consistency:** `HtmlBlockAttributes` fields (`code`, `title`, `width`, `height`) used consistently across: node definition, node view, server tests, DOCX serializer.

**Gaps found during review:** None.
