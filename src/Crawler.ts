import  got from 'got';
import { JSDOM } from 'jsdom';
import { UrlRegistry } from './UrlRegistry';
import { SpaSpider } from './SpaSpider';
import { SsrSpider } from './SsrSpider';
import { Cluster } from 'puppeteer-cluster';

enum Strategy {
  SPA='SPA',
  SSR='SSR',
  Undefined='UNDEFINED'
}

export class Crawler {

  private readonly _urlRegistry: UrlRegistry;
  private readonly _baseUrl: string;
  private _cluster?: Cluster;
  private _strategy: Strategy;

  constructor(urlRegister: UrlRegistry, baseUrl: string) {
    this._urlRegistry = urlRegister;
    this._baseUrl = baseUrl.replace(/\/$/, '');
    this._strategy = Strategy.Undefined;
  }

  async crawl() {
    console.time(`Crawling website "${this._baseUrl}"`);
    try {
      await this.chooseAndInitializeCrawlingStrategy();
      await this._urlRegistry.register(this._baseUrl);
      await this.crawlInternal(this._baseUrl);
    } catch (e) {
      console.error(e);
    } finally {
      await this._cluster?.idle();
      await this._cluster?.close();
    }
    console.timeEnd(`Crawling website "${this._baseUrl}"`);
  }

  async crawlInternal(url: string) {
    if (this._strategy === Strategy.SPA) {
      this._cluster?.queue(url);
    } else {
      const spider: SsrSpider = new SsrSpider(this, this._urlRegistry, this._baseUrl, url);
      await spider.crawlInternal();
    }
  }

  async chooseAndInitializeCrawlingStrategy() {
    this._strategy = Strategy.SSR;

    const { body } = await got.get(this._baseUrl);
    const dom = new JSDOM(body);
    const links = dom.window.document.querySelectorAll('a[href]');

    if (links.length < 10) {
      console.log(`Use "SPA" crawling strategy because less than 10 anchor links were found (actually ${links.length})`);
      this._strategy = Strategy.SPA;
    }

    if (this._strategy === Strategy.SPA) {
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
        const spider: SpaSpider = new SpaSpider(this, this._urlRegistry, page, this._baseUrl, url);
        await spider.crawlInternal();
      });
    }
  }
}
