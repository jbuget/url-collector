import { URL } from 'url';
import { UrlRegister } from './UrlRegister';
import puppeteer, { Page } from 'puppeteer';

export class Crawler {

  private readonly _urlRegister: UrlRegister;

  constructor(urlRegister: UrlRegister) {
    this._urlRegister = urlRegister;
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

      await this._urlRegister.register(url);
      await this.crawlInternal(page, url, url);
    } catch (e) {
      console.error(e);
    } finally {
      if (browser.isConnected()) {
        await browser.close();
      }
    }
  }

  private async crawlInternal(page: Page, baseUrl: string, url: string) {

    if (this._urlRegister.isUrlAlreadyVisited(url)) {
      return;
    }

    if (Crawler.getUrlDomain(baseUrl) !== Crawler.getUrlDomain(url)) {
      return;
    }

    try {
      console.log(`crawl page "${url}"`);

      this._urlRegister.markUrlAsVisited(url);

      await page.goto(url, { waitUntil: 'networkidle2' });

      const anchors: string[] = await page.evaluate(
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

      const absoluteAnchors = anchors.map((anchor: string) => {
        if (anchor && anchor.startsWith && anchor.startsWith('/')) {
          return baseUrl + anchor;
        }
        return anchor;
      })
        .filter((anchor) => /^((http|https):\/\/)/.test(anchor))
        .filter((anchor) => !(/.*\.(pdf|txt)$/i.test(anchor)));

      absoluteAnchors.forEach((anchor: string) => {
        this._urlRegister.register(anchor);
      });

      for (const href of absoluteAnchors) {
        await this.crawlInternal(page, baseUrl, href);
      }
    } catch (e) {
      console.error(`An error occurred crawling URL "${url}"`);
      console.error(e);
    }
  }
}
