import { describe, it, expect } from 'vitest';
import { readHtmlFile, buildSrcdoc, MAX_HTML_FILE_SIZE } from './html-block.utils';

describe('readHtmlFile', () => {
  it('reads file content as string', async () => {
    const content = '<html><body>Hello</body></html>';
    const file = new File([content], 'test.html', { type: 'text/html' });
    const result = await readHtmlFile(file);
    expect(result).toBe(content);
  });

  it('reads unicode content (Japanese characters)', async () => {
    const content = '<html><body>こんにちは世界</body></html>';
    const file = new File([content], 'test.html', { type: 'text/html' });
    const result = await readHtmlFile(file);
    expect(result).toBe(content);
  });
});

describe('buildSrcdoc', () => {
  it('wraps code in full HTML document with doctype and charset', () => {
    const code = '<p>Test</p>';
    const result = buildSrcdoc(code);
    expect(result).toContain('<!doctype html>');
    expect(result).toContain('<meta charset="utf-8">');
    expect(result).toContain('<html>');
  });

  it('keeps code as-is inside body', () => {
    const code = '<p>Hello World</p>';
    const result = buildSrcdoc(code);
    expect(result).toContain('<body>');
    expect(result).toContain(code);
    expect(result).toContain('</body>');
  });
});

describe('MAX_HTML_FILE_SIZE', () => {
  it('equals 512 * 1024', () => {
    expect(MAX_HTML_FILE_SIZE).toBe(512 * 1024);
  });
});
