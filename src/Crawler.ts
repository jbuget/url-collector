import { URL } from 'url';
import { UrlRegistry } from './UrlRegistry';
import puppeteer, { Page } from 'puppeteer';

export class Crawler {

  private readonly _urlRegistry: UrlRegistry;

  constructor(urlRegister: UrlRegistry) {
    this._urlRegistry = urlRegister;
  }

  private static getUrlDomain(url: string) {
    return new URL(url).hostname;
  }

  async crawl(url: string) {
    const browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      devtools: false,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 0, height: 0 });

      await this._urlRegistry.register(url);
      await this.crawlInternal(page, url, url);
    } catch (e) {
      console.error(e);
    } finally {
      if (browser.isConnected()) {
        await browser.close();
      }
    }
  }

  private async crawlInternal(browserPage: Page, baseUrl: string, currentPageUrl: string) {

    if (this._urlRegistry.isUrlAlreadyVisited(currentPageUrl)) {
      return;
    }

    if (Crawler.getUrlDomain(baseUrl) !== Crawler.getUrlDomain(currentPageUrl)) {
      return;
    }

    try {
      console.log(`crawl page "${currentPageUrl}"`);

      this._urlRegistry.markUrlAsVisited(currentPageUrl);

      await browserPage.goto(currentPageUrl, { waitUntil: 'networkidle2' });

      const urls: string[] = await browserPage.evaluate(
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

      for (const url of fullUrls) {
        await this.crawlInternal(browserPage, baseUrl, url);
      }
    } catch (e) {
      console.error(`An error occurred crawling URL "${currentPageUrl}"`);
      console.error(e);
    }
  }
}
