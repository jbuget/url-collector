import { UrlRegistry } from './UrlRegistry';
import { Spider } from './Spider';
import { Cluster } from 'puppeteer-cluster';

export class Crawler {

  private readonly _urlRegistry: UrlRegistry;
  private readonly _baseUrl: string;
  private _cluster?: Cluster;

  constructor(urlRegister: UrlRegistry, baseUrl: string) {
    this._urlRegistry = urlRegister;
    this._baseUrl = baseUrl.replace(/\/$/, '');
  }

  async init() {
    this._cluster = await Cluster.launch({
      concurrency: Cluster.CONCURRENCY_CONTEXT,
      maxConcurrency: 10,
      puppeteerOptions: {
        // @ts-ignore
        ignoreHTTPSErrors: true,
        headless: true,
      }
    });

    await this._cluster.task(async ({ page, data: url }) => {
      // crawler: Crawler, registry: UrlRegistry, browser: Browser, baseUrl: string, pageUrl: string
      const spider: Spider = new Spider(this, this._urlRegistry, page, this._baseUrl, url);
      await spider.crawlInternal();
    });

  }

  async crawl() {
    console.time(`Crawling`);

    try {
      await this._urlRegistry.register(this._baseUrl);
      await this.crawlInternal(this._baseUrl);
    } catch (e) {
      console.error(e);
    } finally {
      await this._cluster?.idle();
      await this._cluster?.close();
    }
    console.timeEnd(`Crawling`);
  }

  async crawlInternal(url: string) {
    this._cluster?.queue(url);
  }
}
