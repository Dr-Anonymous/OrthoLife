import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

const buildDir = 'build';
const BATCH_SIZE = 4; // Puppeteer is resource-intensive, use smaller batches

async function prerenderRoute(browser, route, port) {
  const url = `http://127.0.0.1:${port}${route}`;
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
    const html = await page.content();

    const routePath = path.join(buildDir, route);
    if (route !== '/') {
      await fs.mkdir(routePath, { recursive: true });
    }

    const filePath = path.join(routePath, 'index.html');
    await fs.writeFile(filePath, html);
    console.log(`Saved ${filePath}`);
  } finally {
    await page.close();
  }
}

async function prerender() {
  const port = 4173;
  const server = spawn('npm', ['run', 'preview'], { detached: true });
  console.log('Starting preview server...');

  let serverReady = false;
  const serverReadyPromise = new Promise((resolve, reject) => {
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes(`http://127.0.0.1:${port}`)) {
        console.log('Preview server is ready.');
        serverReady = true;
        resolve();
      }
    });
    server.stderr.on('data', (data) => {
      if (!serverReady) reject(new Error(data.toString()));
    });
  });

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    await serverReadyPromise;

    const sitemapPath = path.join('public', 'sitemap.xml');
    const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
    const locs = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = locs.map(loc => loc.replace(/<\/?loc>/g, ''));
    const routes = urls.map(url => new URL(url).pathname);

    console.log(`Found ${routes.length} routes. Prerendering in batches of ${BATCH_SIZE}.`);

    for (let i = 0; i < routes.length; i += BATCH_SIZE) {
      const batch = routes.slice(i, i + BATCH_SIZE);
      const batchNum = i / BATCH_SIZE + 1;
      console.log(`Processing batch ${batchNum}...`);
      await Promise.all(batch.map(route => prerenderRoute(browser, route, port)));
      console.log(`Batch ${batchNum} complete.`);
    }

    console.log('All pages prerendered successfully.');

  } catch (error) {
    console.error('Prerendering failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
    process.kill(-server.pid);
    console.log('Browser and server stopped.');
  }
}

prerender();
