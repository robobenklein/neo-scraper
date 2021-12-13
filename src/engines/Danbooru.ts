import { ScrapeEngineBase, ScrapeResult, ScrapedPost, ScrapedTag, ScrapedNote } from "../ScrapeEngine";
import { TagCategory } from "../BooruTypes";
import { createNoteFromDanbooruArticle, guessContentType } from "../Utility";

export default class Danbooru extends ScrapeEngineBase {
  name = "danbooru";

  canImport(url: Location): boolean {
    return url.host == "danbooru.donmai.us" || url.host == "safebooru.donmai.us";
  }

  scrapeDocument(document: Document): ScrapeResult {
    let result = new ScrapeResult(this.name);
    let post = new ScrapedPost();
    post.pageUrl = document.location.href;

    // Set image url
    const originalImageElements = Array.from(document.querySelectorAll("#post-information > ul > li > a")).filter(
      (x) => x.parentElement && x.parentElement.innerText.startsWith("Size")
    );

    if (originalImageElements.length > 0) {
      post.contentUrl = (originalImageElements[0] as HTMLAnchorElement).href;
    } else {
      // No point in continuing when we don't have an image.
      return result;
    }

    // Set content type
    if (document.querySelector(".image-container > video") != null) {
      post.contentType = "video";
    } else {
      post.contentType = guessContentType(post.contentUrl);
    }

    // Set post resolution
    // parseInt never throws an error, so we don't have to validate its input.
    const w = parseInt(document.body.dataset["postImageWidth"]!);
    const h = parseInt(document.body.dataset["postImageHeight"]!);
    if (!w || !h) {
      this.log("Couldn't set post resolution.");
    } else {
      post.resolution = [w, h];
    }

    // Set rating
    const safetyExp = new RegExp("Rating: (.*)");
    const safetyElements = Array.from(document.querySelectorAll("#post-information > ul > li"))
      .map((x) => x as HTMLLIElement)
      .filter((x) => x.innerText.startsWith("Rating"));

    if (safetyElements.length > 0) {
      const matches = safetyElements[0].innerText.match(safetyExp);
      if (matches && matches.length > 0) {
        switch (matches[1].toLowerCase()) {
          case "safe":
            post.rating = "safe";
            break;
          case "questionable":
            post.rating = "sketchy";
            break;
          case "explicit":
            post.rating = "unsafe";
            break;
        }
      }
    }

    // Set tags
    const tagElements = Array.from(document.querySelectorAll("#tag-list ul li")).map((x) => x as HTMLLIElement);
    for (const tagElement of tagElements) {
      let tagName: string | undefined;
      const tagNameElement = tagElement.querySelector(".search-tag") as HTMLAnchorElement;
      if (tagNameElement) {
        tagName = tagNameElement.innerText;
      }

      let category: TagCategory | undefined;
      switch (tagElement.className) {
        case "tag-type-3":
          category = "copyright";
          break;
        case "tag-type-4":
          category = "character";
          break;
        case "tag-type-1":
          category = "artist";
          break;
        case "tag-type-5":
          category = "meta";
          break;
      }

      if (tagName) {
        let tag = new ScrapedTag(tagName, category);
        post.tags.push(tag);
      }
    }

    // Set source
    const sourceEl = document.getElementById("post-info-source");
    if (sourceEl && sourceEl.children.length > 0) {
      const sourceLink = sourceEl.children[0] as HTMLAnchorElement;
      if (sourceLink) {
        post.source = sourceLink.href;
      }
    }

    // Try to load notes
    const noteEls = Array.from(document.querySelectorAll("section#notes > article")).map((x) => x as HTMLElement);

    for (const el of noteEls) {
      const note = createNoteFromDanbooruArticle(post, el);
      if (note) {
        post.notes.push(note);
      }
    }

    result.tryAddPost(post);

    return result;
  }
}
