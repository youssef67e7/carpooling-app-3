import { readFileSync, writeFileSync } from 'fs';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const md = readFileSync('MASTER_REPORT.md', 'utf-8');
const css = readFileSync('report-style.css', 'utf-8');
const html = marked.parse(md);

const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${css}</style>
</head>
<body>
  ${html}
</body>
</html>`;

writeFileSync('report-temp.html', fullHtml);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
});
const page = await browser.newPage();
await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
await page.pdf({
  path: 'REPORTPDF.pdf',
  format: 'A4',
  margin: { top: '2.5cm', right: '2cm', bottom: '2.5cm', left: '2cm' },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:10px;text-align:center;width:100%;color:#666;"><span class="pageNumber"></span></div>'
});
await browser.close();
console.log('PDF generated: REPORT.pdf');
