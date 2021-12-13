import { ScrapeEngine, ScrapeResult, ScrapedPost, ScrapedTag } from "../ScrapeEngine";
import { TagCategory } from "../BooruTypes";
import { guessContentType } from "../Utility";

export default class Pixiv implements ScrapeEngine {
  name = "pixiv";

  canImport(url: Location): boolean {
    return url.host == "pixiv.net" || url.host == "www.pixiv.net";
  }

  scrapeDocument(document: Document): ScrapeResult {
    let result = new ScrapeResult(this.name);

    const imgLinks = Array.from(document.querySelectorAll("div[role='presentation'] > a")).map(
      (x) => x as HTMLAnchorElement
    );

    for (const imgLink of imgLinks) {
      let post = new ScrapedPost();
      post.pageUrl = document.location.href;
      post.contentUrl = imgLink.href;
      post.contentType = guessContentType(post.contentUrl);
      post.referrer = document.location.origin;

      let author_id: string | null | undefined = document.querySelector("aside a")?.getAttribute("data-gtm-value");

      if (author_id) {
        let tag = new ScrapedTag(`pixiv_user_${author_id}`, "artist");
        post.tags.push(tag);
      }

      result.tryAddPost(post);
    }

    return result;
  }
}
