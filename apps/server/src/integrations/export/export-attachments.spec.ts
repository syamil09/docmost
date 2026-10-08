import { htmlToJson, jsonToHtml } from '../../collaboration/collaboration.util';
import {
  getExportAttachmentIds,
  updateAttachmentUrlsToLocalPaths,
} from './utils';

const ID = '01a0b865-8713-758c-b576-4a735d875845';
const OTHER_ID = '01a0b867-1f4f-742f-afc1-1e65a6247531';

const findImages = (json: any, out: any[] = []): any[] => {
  if (!json || typeof json !== 'object') return out;
  if (json.type === 'image') out.push(json);
  if (Array.isArray(json.content)) {
    for (const child of json.content) findImages(child, out);
  }
  return out;
};

// shape of <img> pushed through the API/MCP as raw HTML: absolute URL,
// no data-attachment-id, so the image node has no attachmentId attr
const absoluteImg = (id: string, name: string) =>
  `<img src="http://103.196.154.92:3000/api/files/${id}/${name}" width="289" height="441" data-align="center" alt="Screenshot">`;

describe('export attachments', () => {
  describe('getExportAttachmentIds', () => {
    it('collects the id of an image that only has an absolute /api/files src', () => {
      const json = htmlToJson(absoluteImg(ID, 'fs-sh-012-login.png'));

      expect(getExportAttachmentIds(json)).toEqual([ID]);
    });

    it('collects the attachmentId of an image uploaded through the editor', () => {
      const json = htmlToJson(
        `<img src="/api/files/${ID}/image.png" data-attachment-id="${ID}">`,
      );

      expect(getExportAttachmentIds(json)).toEqual([ID]);
    });

    it('ignores external image urls', () => {
      const json = htmlToJson(
        '<img src="https://example.com/images/logo.png">',
      );

      expect(getExportAttachmentIds(json)).toEqual([]);
    });

    it('returns each id once', () => {
      const json = htmlToJson(
        absoluteImg(ID, 'a.png') + absoluteImg(ID, 'a.png'),
      );

      expect(getExportAttachmentIds(json)).toEqual([ID]);
    });
  });

  describe('updateAttachmentUrlsToLocalPaths', () => {
    it('rewrites an absolute /api/files src to the local zip path when the file was exported', () => {
      const json = htmlToJson(absoluteImg(ID, 'fs-sh-012-login.png'));

      const updated = updateAttachmentUrlsToLocalPaths(
        json,
        new Map([[ID, 'fs-sh-012-login.png']]),
      );

      expect(findImages(updated)[0].attrs.src).toBe(
        `files/${ID}/fs-sh-012-login.png`,
      );
      expect(jsonToHtml(updated)).not.toContain('103.196.154.92');
    });

    it('uses the stored file name so src matches the zip entry', () => {
      const json = htmlToJson(absoluteImg(ID, 'renamed.png'));

      const updated = updateAttachmentUrlsToLocalPaths(
        json,
        new Map([[ID, 'original name.png']]),
      );

      expect(findImages(updated)[0].attrs.src).toBe(
        `files/${ID}/original name.png`,
      );
    });

    it('leaves an absolute src untouched when its file was not exported', () => {
      const json = htmlToJson(absoluteImg(OTHER_ID, 'missing.png'));

      const updated = updateAttachmentUrlsToLocalPaths(
        json,
        new Map([[ID, 'fs-sh-012-login.png']]),
      );

      expect(findImages(updated)[0].attrs.src).toBe(
        `http://103.196.154.92:3000/api/files/${OTHER_ID}/missing.png`,
      );
    });

    it('still rewrites a relative /api/files src', () => {
      const json = htmlToJson(
        `<img src="/api/files/${ID}/image.png" data-attachment-id="${ID}">`,
      );

      const updated = updateAttachmentUrlsToLocalPaths(json);

      expect(findImages(updated)[0].attrs.src).toBe(`files/${ID}/image.png`);
    });

    it('leaves external image urls untouched', () => {
      const src = 'https://example.com/images/logo.png';
      const json = htmlToJson(`<img src="${src}">`);

      const updated = updateAttachmentUrlsToLocalPaths(
        json,
        new Map([[ID, 'fs-sh-012-login.png']]),
      );

      expect(findImages(updated)[0].attrs.src).toBe(src);
    });
  });
});
