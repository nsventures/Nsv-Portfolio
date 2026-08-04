import { readFileSync, writeFileSync } from 'node:fs'
import { marked } from 'marked'

const md = readFileSync('docs/META_WABA_SETUP_GUIDE.md', 'utf8')
const body = marked.parse(md)

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Meta + WABA Setup Guide — NS Ventures Portfolio</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 820px; margin: 2rem auto; padding: 0 1.25rem 3rem; line-height: 1.55; color: #111; }
  h1,h2,h3 { font-family: system-ui, Segoe UI, sans-serif; line-height: 1.25; }
  h1 { font-size: 1.75rem; }
  h2 { margin-top: 2rem; border-top: 1px solid #ddd; padding-top: 1.25rem; font-size: 1.25rem; }
  h3 { font-size: 1.05rem; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.95rem; }
  th, td { border: 1px solid #ccc; padding: 0.45rem 0.6rem; vertical-align: top; }
  th { background: #f4f4f4; text-align: left; }
  code, pre { font-family: ui-monospace, Consolas, monospace; font-size: 0.88rem; }
  pre { background: #f6f8fa; padding: 0.9rem 1rem; overflow: auto; border-radius: 6px; }
  a { color: #0b57d0; }
  .print-hint { font-family: system-ui, sans-serif; background: #eef6ff; border: 1px solid #c9dff7; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
  @media print {
    .print-hint { display: none; }
    body { margin: 0; max-width: none; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
<p class="print-hint"><strong>Download PDF:</strong> Open this file in Chrome/Edge → <kbd>Ctrl+P</kbd> → Destination: <em>Save as PDF</em>.</p>
${body}
</body>
</html>
`

writeFileSync('docs/META_WABA_SETUP_GUIDE.html', html)
console.log('Wrote docs/META_WABA_SETUP_GUIDE.html')
