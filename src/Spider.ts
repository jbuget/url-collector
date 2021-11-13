import { Page } from 'puppeteer';
import { UrlRegistry } from './UrlRegistry';
import { URL } from 'url';
import { Crawler } from './Crawler';

export class Spider {

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

      await this.page.goto(this.pageUrl, { waitUntil: 'networkidle2' });

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
              if (!href || href.trim().length === 0) return false;
              if (href.startsWith('//')) return false;
              if (/.*\.(pdf|txt)$/i.test(href)) return false;
              return true;
            });
        }
      );

      const fullUrls = urls.map((url: string) => {
        if (url && url.startsWith && url.startsWith('/')) {
          return this.baseUrl + url;
        }
        return url;
      });

      fullUrls.forEach((url: string) => {
        this.registry.register(url);
      });

      //await this.page.close();

      for (const url of fullUrls) {
        if (Spider.getUrlDomain(this.baseUrl) === Spider.getUrlDomain(url)
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