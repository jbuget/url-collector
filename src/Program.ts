import { Command } from 'commander';
import { LIB_VERSION } from './version';
import * as fs from 'fs';
import { UrlRegister } from './UrlRegister';
import { Crawler } from './Crawler';

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
    const crawler: Crawler = new Crawler(this._urlRegister);
    await crawler.crawl(url);

    // Output
    const log = fs.createWriteStream(options.output);
    for (let crawledPage of this._urlRegister.listAll()) {
      log.write(`${crawledPage.url}\n`);
    }
    log.end();
  }
}
