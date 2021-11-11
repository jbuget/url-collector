import { Command } from 'commander';
import puppeteer from 'puppeteer';
import { LIB_VERSION } from './version';
import * as fs from 'fs';
import { UrlRegister } from './UrlRegister';

export default class Program {
  private readonly _version: string;
  private readonly _command: Command;
  private readonly _urlRegister: UrlRegister;

  constructor() {
    this._version = LIB_VERSION;
    this._command = new Command();
    this._command
      .version(this._version)
      .requiredOption('-u, --url <url>', 'URL to crawl')
      .requiredOption('-o, --output <url>', 'specify the output file')
      .option('-s, --screenshot <screenshot>', 'specify the screenshot filepath');
    this._urlRegister = new UrlRegister();
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
      headless: false,
      ignoreHTTPSErrors: true,
      devtools: true
    });
    const page = await browser.newPage();

    await page.setViewport({ width: 0, height: 0 });

    await page.goto(url);

    const anchors: string[] = await page.evaluate(
      () => {
        /*
          ⚠️ From here you are not in Node but in the browser.
          Set `devtools: true` in `puppeteer.launch` options to be able to debug.
        */
        return Array.from(
          // @ts-ignore
          document.querySelectorAll('a[href]'),
          (anchor: any) => anchor.getAttribute('href')
        );
      }
    );

    await browser.close();

    anchors.forEach((href: string) => {
      if (/^((http|https):\/\/)/.test(href)) {
        this._urlRegister.register(href);
      }
      if (href.startsWith('/')) {
        this._urlRegister.register(url + href);
      }
    });

    // Output
    const log = fs.createWriteStream(options.output);
    for (let url of this._urlRegister.listAll()) {
      log.write(`${url}\n`);
    }
    log.end();
  }
}
