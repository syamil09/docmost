import * as JSZip from 'jszip';
import { htmlToJson } from '../../collaboration/collaboration.util';
import { ExportService } from './export.service';
import { ExportFormat } from './dto/export-dto';

// ESM-only package jest can't load; only used for page mentions, not here
jest.mock('@sindresorhus/slugify', () => ({
  __esModule: true,
  default: (s: string) => s,
}));

const SPACE_ID = '01a0b000-0000-7000-8000-000000000001';
const PAGE_ID = '01a0b000-0000-7000-8000-000000000002';
const ID = '01a0b865-8713-758c-b576-4a735d875845';
const MISSING_ID = '01a0b867-1f4f-742f-afc1-1e65a6247531';

// minimal kysely stand-in: every builder call chains, execute() resolves rows
const fakeDb = (rows: any[]) => {
  const chain: any = new Proxy(
    {},
    {
      get: (_target, prop) =>
        prop === 'execute' ? async () => rows : () => chain,
    },
  );
  return chain;
};

const buildService = (attachmentRows: any[]) => {
  const storageService = {
    read: jest.fn(async () => Buffer.from('png-bytes')),
  };
  const service = new ExportService(
    {} as any,
    {} as any,
    fakeDb(attachmentRows),
    storageService as any,
    {} as any,
    {} as any,
  );
  return { service, storageService };
};

const pageWithHtml = (html: string): any => ({
  id: PAGE_ID,
  slugId: 'abc123',
  title: 'User Manual',
  spaceId: SPACE_ID,
  workspaceId: 'ws',
  position: 'a0',
  icon: null,
  content: htmlToJson(html),
});

// first html<->json conversion builds the editor schema, which can exceed
// jest's 5s default when the whole suite runs in parallel
jest.setTimeout(30_000);

describe('ExportService.zipPages attachments', () => {
  it('packs images referenced by absolute /api/files url and points the html at the local copy', async () => {
    const { service } = buildService([
      {
        id: ID,
        fileName: 'fs-sh-012-login.png',
        filePath: `x/${ID}/fs-sh-012-login.png`,
        pageId: PAGE_ID,
      },
    ]);
    const page = pageWithHtml(
      `<img src="http://103.196.154.92:3000/api/files/${ID}/fs-sh-012-login.png" data-align="center">`,
    );
    const zip = new JSZip();

    await service.zipPages(
      { null: [page] } as any,
      ExportFormat.HTML,
      zip,
      true,
      'http://103.196.154.92:3000',
      undefined,
      true,
    );

    // zipAttachments writes "/files/..."; the importer strips leading slashes
    const files = Object.keys(zip.files).map((f) => f.replace(/^\/+/, ''));
    expect(files).toContain(`files/${ID}/fs-sh-012-login.png`);

    const html = await zip.file('User Manual.html').async('string');
    expect(html).toContain(`src="files/${ID}/fs-sh-012-login.png"`);
    expect(html).not.toContain('103.196.154.92');
  });

  it('keeps the absolute url for an image whose attachment is not in the space', async () => {
    const { service, storageService } = buildService([]);
    const src = `http://103.196.154.92:3000/api/files/${MISSING_ID}/gone.png`;
    const zip = new JSZip();

    await service.zipPages(
      { null: [pageWithHtml(`<img src="${src}">`)] } as any,
      ExportFormat.HTML,
      zip,
      true,
      'http://103.196.154.92:3000',
      undefined,
      true,
    );

    expect(storageService.read).not.toHaveBeenCalled();
    const html = await zip.file('User Manual.html').async('string');
    expect(html).toContain(`src="${src}"`);
  });
});
