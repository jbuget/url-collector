import { Command } from 'commander';
import puppeteer from 'puppeteer';
import { LIB_VERSION } from './version';
import * as fs from 'fs';

export default class Program {
  private readonly _version: string;
  private readonly _command: Command;

  constructor() {
    this._version = LIB_VERSION;
    this._command = new Command();
    this._command
      .version(this._version)
      .requiredOption('-u, --url <url>', 'URL to crawl')
      .option('-s, --screenshot <screenshot>', 'specify the screenshot filepath');
  }

  async run(argv: string[]): Promise<void> {
    // Input
    this._command.parse(argv);
    const options = this._command.opts();

    const url = options.url;
    if (!url) {
      throw "Please provide a URL as the last argument";
    }

    // Treatment
    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: 1680,
      height: 1250,
    });
    await page.goto(url);

    await page.waitForTimeout(30000);

    // @ts-ignore
    const hrefs = await page.evaluate(
      () => Array.from(
        // @ts-ignore
        document.querySelectorAll('a[href]'),
        // @ts-ignore
        a => a.getAttribute('href')
      )
    );
    const srcs = await page.evaluate(
      () => Array.from(
        // @ts-ignore
        document.querySelectorAll('img[src]'),
        // @ts-ignore
        (img) => img.getAttribute('src')
      )
    );

    await browser.close();

    // Output
    let links: string[] = [];
    let i = 1;
    links = links.concat(hrefs.filter((src) => src.startsWith('http')));
    links = links.concat(srcs.filter((src) => src.startsWith('http')));

    const log = fs.createWriteStream('tmp/links.csv', { flags: 'a' });
    for (let link of links) {
      log.write(`${i++};${link}\n`);
    }
    log.end();
    console.log('added lines = ' + i);

  }
}
