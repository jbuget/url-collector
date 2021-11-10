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
      throw 'Please provide a URL as the last argument';
    }

    // Treatment
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1250,
    });
    await page.goto(url);

    await page.waitForTimeout(500);

    const hrefs = await page.evaluate(
      async () => Array.from(
        // @ts-ignore
        document.querySelectorAll('a[href]'),
        (a: any) => a.getAttribute('href')
      )
    );

    await browser.close();

    // Output
    let links: string[] = [];
    let i = 1;
    // @ts-ignore
    links = links.concat(hrefs.map((href: string): string => {
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return href;
      }
      if (href.startsWith('/')) {
        return url + href;
      }
      return '';
    }));

    const log = fs.createWriteStream('tmp/links.csv', { flags: 'a' });
    for (let link of links) {
      log.write(`${i++};${link}\n`);
    }
    log.end();
    console.log('added lines = ' + i);
  }
}
