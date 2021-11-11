const { URL } = require('url');

export class UrlRegister {
  private readonly urls: Map<string, string>;

  constructor() {
    this.urls = new Map<string, string>();
  }

  cleanUrl(stringUrl: string): string {
    return stringUrl.replace(/\/$/, '');
  }

  register(stringUrl: string) {
    try {
      const protocols = ['http', 'https'];
      const cleanUrl = this.cleanUrl(stringUrl);
      const urlObject = new URL(cleanUrl);
      const isValidUrl = protocols.map(x => `${x.toLowerCase()}:`).includes(urlObject.protocol);
      if (isValidUrl) {
        this.urls.set(cleanUrl, cleanUrl);
      }
    } catch (err) {
      throw new Error(`Can not register url "${stringUrl}"`);
    }

  }

  resolve(stringUrl: string) {
    const cleanUrl = this.cleanUrl(stringUrl);
    return this.urls.get(cleanUrl);
  }

  listAll() {
    return this.urls.values();
  }

  remove(stringUrl: string) {
    const cleanUrl = this.cleanUrl(stringUrl);
    this.urls.delete(cleanUrl);
  }
}
