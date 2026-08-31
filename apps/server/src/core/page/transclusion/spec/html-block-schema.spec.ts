import { generateJSON, generateHTML } from "@tiptap/html";
import { addUniqueIdsToDoc, HtmlBlock } from "@docmost/editor-ext";

const tiptapExtensions = [
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
