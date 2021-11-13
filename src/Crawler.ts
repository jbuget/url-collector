import { URL } from 'url';
import { UrlRegistry } from './UrlRegistry';
import puppeteer, { Browser } from 'puppeteer';
import { Spider } from './Spider';

export class Crawler {

  private readonly _urlRegistry: UrlRegistry;

  constructor(urlRegister: UrlRegistry) {
    this._urlRegistry = urlRegister;
  }

  async crawl(url: string) {
    console.time(`Crawling`);

    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
    });

    try {
      await this._urlRegistry.register(url);
      await this.crawlInternal(browser, url, url);
    } catch (e) {
      console.error(e);
    } finally {
      if (browser.isConnected()) {
        await browser.close();
      }
    }
    console.timeEnd(`Crawling`);
  }

  async crawlInternal(browser: Browser, baseUrl: string, url: string) {
    const spider: Spider = new Spider(this, this._urlRegistry, browser, baseUrl, url);
    await spider.crawlInternal();
  }
}
