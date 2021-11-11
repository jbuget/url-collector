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

    let url = options.url;
    if (!url) {
      throw 'Please provide a URL as the last argument';
    }
    url = url.replace(/\/$/, '');

    // Treatment
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 0, height: 0 });
    await page.goto(url);

    const hrefs = await page.evaluate(
      async () => Array.from(
        // @ts-ignore
        document.querySelectorAll('a[href]'),
        (a: any) => a.getAttribute('href')
      )
    );

    await browser.close();

    let links: string[] = hrefs.reduce((accumulatedLinks: string[], href: string) => {
      if (/^((http|https):\/\/)/.test(href)) {
        accumulatedLinks.push(href);
      }
      if (href.startsWith('/')) {
        accumulatedLinks.push(url + href);
      }
      return accumulatedLinks;
    }, []);

    // Output
    const log = fs.createWriteStream('tmp/links.csv', { flags: 'a' });
    for (let link of links) {
      log.write(`${link}\n`);
    }
    log.end();
  }
}
