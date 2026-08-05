const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
  const filePath = path.join(__dirname, '..', 'index.html');
  if (!fs.existsSync(filePath)) {
    console.error('index.html not found at', filePath);
    process.exit(2);
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(html, { url: 'http://localhost' });
  const { window } = dom;

  try {
    // Expose JSDOM globals expected by axe-core
      global.window = window;
      global.Node = window.Node;
      global.HTMLElement = window.HTMLElement;
      global.Document = window.Document;
      global.document = window.document;
      global.navigator = window.navigator || { userAgent: 'node.js' };
      global.location = window.location;
      global.getComputedStyle = window.getComputedStyle;

      // Require axe-core after globals are set so it can attach correctly
      const axe = require('axe-core');
      const results = await axe.run(window.document);
    const out = path.join(__dirname, '..', 'axe_node_report.json');
    fs.writeFileSync(out, JSON.stringify(results, null, 2));
    console.log('Accessibility scan complete — report saved to', out);
  } catch (err) {
    console.error('axe run error:', err);
    process.exit(1);
  }
}

run();
