import { UrlRegistry } from './UrlRegistry';
import { URL } from 'url';
import { Crawler } from './Crawler';
import got from 'got';
import { JSDOM } from 'jsdom';

export class SsrSpider {

  crawler: Crawler;
  registry: UrlRegistry;
  baseUrl: string;
  pageUrl: string;

  constructor(crawler: Crawler, registry: UrlRegistry, baseUrl: string, pageUrl: string) {
    this.crawler = crawler;
    this.registry = registry;
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

      const { url: finalPageUrl, body } = await got.get(this.pageUrl);

      // Take into account the case of a redirection outside the base URL domain
      if (SsrSpider.getUrlDomain(this.baseUrl) !== SsrSpider.getUrlDomain(finalPageUrl)) {
        return;
      }

      const dom = new JSDOM(body);
      const links = dom.window.document.querySelectorAll('a[href]');
      const urls: string[] = Array
        .from(links, (anchor: any) => anchor.getAttribute('href'))
        .filter((href) => {
          if (!href) return false;
          if (!href.startsWith || href.startsWith('//') || href.startsWith('#')) return false;
          if (/.*\.(pdf|txt)$/i.test(href)) return false;
          return true;
        });

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

      for (const url of fullUrls) {
        if (SsrSpider.getUrlDomain(this.baseUrl) === SsrSpider.getUrlDomain(url)
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
