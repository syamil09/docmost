import { Node, mergeAttributes } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

export interface HtmlBlockOptions {
  HTMLAttributes: Record<string, any>;
  view: any;
}

export interface HtmlBlockAttributes {
  code: string;
  title: string | null;
  width: number;
  height: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    htmlBlock: {
      insertHtmlBlock: (attributes?: Partial<HtmlBlockAttributes>) => ReturnType;
    };
  }
}

export const HtmlBlock = Node.create<HtmlBlockOptions>({
  name: "htmlBlock",

  addOptions() {
    return {
      HTMLAttributes: {},
      view: null,
    };
  },

  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      code: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-code") ?? "",
        renderHTML: (attributes: HtmlBlockAttributes) => ({
          "data-code": attributes.code,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes: HtmlBlockAttributes) => ({
          "data-title": attributes.title ?? "",
        }),
      },
      width: {
        default: 800,
        parseHTML: (element) => {
          const val = element.getAttribute("data-width");
          return val ? parseInt(val, 10) : 800;
        },
        renderHTML: (attributes: HtmlBlockAttributes) => ({
          "data-width": String(attributes.width),
        }),
      },
      height: {
        default: 500,
        parseHTML: (element) => {
          const val = element.getAttribute("data-height");
          return val ? parseInt(val, 10) : 500;
        },
        renderHTML: (attributes: HtmlBlockAttributes) => ({
          "data-height": String(attributes.height),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": this.name },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ["pre", {}, HTMLAttributes["data-code"] || ""],
    ];
  },

  addCommands() {
    return {
      insertHtmlBlock:
        (attributes: Partial<HtmlBlockAttributes> = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: "",
              title: null,
              width: 800,
              height: 500,
              ...attributes,
            },
          });
        },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("htmlBlockInputGuard");
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleTextInput: (view, from, to, text) => {
            const { selection } = view.state;
            if (!(selection instanceof NodeSelection)) {
              return false;
            }
            if (selection.node.type.name !== this.name) {
              return false;
            }
            return true;
          },
          handlePaste: (view, event, slice) => {
            const { selection } = view.state;
            if (!(selection instanceof NodeSelection)) {
              return false;
            }
            if (selection.node.type.name !== this.name) {
              return false;
            }
            return true;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        if (!(selection instanceof NodeSelection)) {
          return false;
        }

        if (selection.node.type.name !== this.name) {
          return false;
        }

        const pos = selection.from;
        const { tr } = state;
        tr.delete(pos, selection.to);
        tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
        view.dispatch(tr);
        return true;
      },
      Delete: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;

        if (!(selection instanceof NodeSelection)) {
          return false;
        }

        if (selection.node.type.name !== this.name) {
          return false;
        }

        const pos = selection.from;
        const { tr } = state;
        tr.delete(pos, selection.to);
        tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
        view.dispatch(tr);
        return true;
      },
    };
  },
});
