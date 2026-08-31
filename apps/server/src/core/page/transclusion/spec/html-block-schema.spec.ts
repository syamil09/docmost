import { jsonToHtml, htmlToJson } from "../../../../collaboration/collaboration.util";

describe("HtmlBlock schema", () => {
  it("generates JSON from HTML with data-code attribute", () => {
    const html = `<div data-type="htmlBlock" data-code="&lt;b&gt;hello&lt;/b&gt;" data-width="800" data-height="500"></div>`;
    const json = htmlToJson(html);
    expect(json.content?.[0]?.type).toBe("htmlBlock");
    expect(json.content?.[0]?.attrs?.code).toBe("<b>hello</b>");
    expect(json.content?.[0]?.attrs?.width).toBe(800);
    expect(json.content?.[0]?.attrs?.height).toBe(500);
  });

  it("round-trips code through jsonToHtml then htmlToJson", () => {
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
    const html = jsonToHtml(originalJson);
    const reparsed = htmlToJson(html);
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
    const html = jsonToHtml(originalJson);
    const reparsed = htmlToJson(html);
    expect(reparsed.content?.[0]?.attrs?.code).toBe("你好");
  });
});
