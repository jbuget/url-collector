const { URL } = require('url');

export class CrawlPage {
  url: string;
  crawled: boolean;

  constructor(url: string) {
    this.url = url;
    this.crawled = false;
  }

  markAsCrawled() {
    this.crawled = true;
  }
}

export class UrlRegister {
  private readonly urls: Map<string, CrawlPage>;

  constructor() {
    this.urls = new Map<string, CrawlPage>();
  }

  cleanUrl(stringUrl: string): string {
    return stringUrl.replace(/\/$/, '');
  }

  register(stringUrl: string) {
    const cleanUrl = this.cleanUrl(stringUrl);
    if (!!this.urls.get(cleanUrl)) {
      return;
    }

    try {
      const protocols = ['http', 'https'];
      const urlObject = new URL(cleanUrl);
      const isValidUrl = protocols.map(x => `${x.toLowerCase()}:`).includes(urlObject.protocol);
      if (isValidUrl) {
        const crawlPage = new CrawlPage(cleanUrl);
        this.urls.set(cleanUrl, crawlPage);
      }
    } catch (err) {
      throw new Error(`Can not register url "${stringUrl}"`);
    }
  }

  listAll() {
    return this.urls.values();
  }

  isUrlAlreadyVisited(stringUrl: string) {
    const cleanUrl = this.cleanUrl(stringUrl);
    const crawlPage = this.urls.get(cleanUrl);
    if (crawlPage) {
      return crawlPage.crawled;
    }
    return false;
  }

  markUrlAsVisited(stringUrl: string) {
    const cleanUrl = this.cleanUrl(stringUrl);
    const crawlPage = this.urls.get(cleanUrl);
    if (crawlPage) {
      crawlPage.markAsCrawled();
    }
  }
}
