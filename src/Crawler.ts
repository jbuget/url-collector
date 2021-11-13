import { URL } from 'url';
import { UrlRegistry } from './UrlRegistry';
import puppeteer, { Browser } from 'puppeteer';

export class Crawler {

  private readonly _urlRegistry: UrlRegistry;

  constructor(urlRegister: UrlRegistry) {
    this._urlRegistry = urlRegister;
  }

  private static getUrlDomain(url: string) {
    return new URL(url).hostname;
  }

  async crawl(url: string) {
    console.time(`Crawling`);

    const browser = await puppeteer.launch({
      headless: false,
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

  private async crawlInternal(browser: Browser, baseUrl: string, currentPageUrl: string) {
    console.log(`crawl page "${currentPageUrl}"`);

    try {
      this._urlRegistry.markUrlAsVisited(currentPageUrl);

      const page = await browser.newPage();
      await page.setViewport({ width: 0, height: 0 });
      await page.goto(currentPageUrl, { waitUntil: 'networkidle2' });

      const urls: string[] = await page.evaluate(
        async () => {
          /*
            ⚠️ From here you are not in Node but in the browser.
            Set `devtools: true` in `puppeteer.launch` options to be able to debug.
          */
          // @ts-ignore
          const links = document.querySelectorAll('a[href]');
          return Array.from(links, (anchor: any) => anchor.getAttribute('href'));
        }
      );

      const fullUrls = urls.map((url: string) => {
        if (url && url.startsWith && url.startsWith('/')) {
          return baseUrl + url;
        }
        return url;
      })
        .filter((url) => /^((http|https):\/\/)/.test(url))
        .filter((url) => !(/.*\.(pdf|txt)$/i.test(url)));

      fullUrls.forEach((url: string) => {
        this._urlRegistry.register(url);
      });

      await page.close();

      for (const url of fullUrls) {
        if (Crawler.getUrlDomain(baseUrl) === Crawler.getUrlDomain(url)
          && !this._urlRegistry.isUrlAlreadyVisited(url)) {
          await this.crawlInternal(browser, baseUrl, url);
        } else {
          this._urlRegistry.markUrlAsVisited(url);
        }
      }
    } catch (e) {
      console.error(`An error occurred crawling URL "${currentPageUrl}"`);
      console.error(e);
    }
  }
}
