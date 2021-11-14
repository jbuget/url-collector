import { Page } from 'puppeteer';
import { UrlRegistry } from './UrlRegistry';
import { URL } from 'url';
import { Crawler } from './Crawler';

export class SpaSpider {

  crawler: Crawler;
  registry: UrlRegistry;
  page: Page;
  baseUrl: string;
  pageUrl: string;

  constructor(crawler: Crawler, registry: UrlRegistry, page: Page, baseUrl: string, pageUrl: string) {
    this.crawler = crawler;
    this.registry = registry;
    this.page = page;
    this.baseUrl = baseUrl;
    this.pageUrl = pageUrl;
  }

  private static getUrlDomain(url: string) {
    return new URL(url).hostname;
  }

  async crawlInternal() {
    // Simple check when running multiple spiders in parallel
    if (this.registry.isUrlAlreadyVisited(this.pageUrl)) {
      return
    }

    try {
      console.log(`crawl page "${this.pageUrl}"`);
      this.registry.markUrlAsVisited(this.pageUrl);

      await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });
      await this.page.waitForSelector('a[href]');

      // Take into account the case of a redirection outside the base URL domain
      if (SpaSpider.getUrlDomain(this.baseUrl) !== SpaSpider.getUrlDomain(this.page.url())) {
        return;
      }

      const urls: string[] = await this.page.evaluate(
        async () => {
          /*
            ⚠️ From here you are not in Node but in the browser.
            Set `devtools: true` in `puppeteer.launch` options to be able to debug.
          */
          // @ts-ignore
          const links = document.querySelectorAll('a[href]');
          return Array
            .from(links, (anchor: any) => anchor.getAttribute('href'))
            .filter((href) => {
              if (!href) return false;
              if (!href.startsWith || href.startsWith('//') || href.startsWith('#')) return false;
              if (/.*\.(pdf|txt)$/i.test(href)) return false;
              return true;
            });
        }
      );

      const fullUrls = urls.map((url: string) => {
        let fullUrl;
        if (url && url.startsWith && url.startsWith('/')) {
          fullUrl = this.baseUrl + url;
        } else {
          if (/(http:\/\/|https:\/\/)/i.test(url)) {
            fullUrl = url;
          }
          else {
            fullUrl = `https://${url}`;
          }
        }
        fullUrl = fullUrl.split('?')[0];
        return fullUrl;
      });

      fullUrls.forEach((url: string) => {
        this.registry.register(url);
      });

      //await this.page.close();

      for (const url of fullUrls) {
        if (SpaSpider.getUrlDomain(this.baseUrl) === SpaSpider.getUrlDomain(url)
          && !this.registry.isUrlAlreadyVisited(url)) {
          await this.crawler.crawlInternal(url);
        } else {
          this.registry.markUrlAsVisited(url);
        }
      }
    } catch (e) {
      console.error(`An error occurred crawling URL "${this.pageUrl}"`);
      console.error(e);
    }
  }

}
