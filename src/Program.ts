import { Command } from 'commander';
import { LIB_VERSION } from './version';
import * as fs from 'fs';
import { UrlRegistry } from './UrlRegistry';
import { Crawler } from './Crawler';

export default class Program {
  private readonly _version: string;
  private readonly _command: Command;
  private readonly _urlRegistry: UrlRegistry;

  constructor() {
    this._version = LIB_VERSION;
    this._command = new Command();
    this._command
      .version(this._version)
      .requiredOption('-u, --url <url>', 'URL to crawl')
      .requiredOption('-o, --output <url>', 'specify the output file')
      .option('-s, --screenshot <screenshot>', 'specify the screenshot filepath');
    this._urlRegistry = new UrlRegistry();
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
    const crawler: Crawler = new Crawler(this._urlRegistry, url);
    await crawler.init();
    await crawler.crawl();

    // Output
    const log = fs.createWriteStream(options.output);
    for (let crawledPage of this._urlRegistry.listAll()) {
      log.write(`${crawledPage.url}\n`);
    }
    log.end();
  }
}
