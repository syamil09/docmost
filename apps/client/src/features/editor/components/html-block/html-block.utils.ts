export const MAX_HTML_FILE_SIZE = 512 * 1024;

export const readHtmlFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const buildSrcdoc = (code: string): string => {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
html, body { margin: 0; padding: 0; box-sizing: border-box; width: 100%; height: 100%; }
</style>
</head>
<body>${code}</body>
</html>`;
};
