import { ScrapeEngine, ScrapeResult, ScrapedPost, ScrapedTag } from "../ScrapeEngine";
import { guessContentType } from "../Utility";

/**
 * True when the sub is known to use map dims in titles
 **/
function isMapSub(sub: string) {
  if ([
    'battlemaps',
    'FantasyMaps',
    'dndmaps',
    'FoundryVTT',
    'Phasedbattlemaps',
  ].includes(sub)) return true;
  return false;
}

function getMapTags(
  document: Document, post: ScrapedPost,
  {
    reddit_post_title = null,
    postImgPreviewEl = undefined,
  }: {reddit_post_title?: string | null, postImgPreviewEl?: HTMLImageElement | undefined}={},
) {
  // TODO
  if (reddit_post_title) {
    let exp = new RegExp('[\\[\\(](?<dim1>\\d{1,3})(?<numsep>\\D)+(?<dim2>\\d{1,3}).*?[\\]\\)]', 'gm');
    let match = exp.exec(reddit_post_title);
    if (match) {
      let dim1 = Number.parseInt(match.groups!.dim1);
      let dim2 = Number.parseInt(match.groups!.dim2);

      if (postImgPreviewEl) {
        const postImgPreviewBounds = postImgPreviewEl.getBoundingClientRect();
        if (postImgPreviewBounds.width > postImgPreviewBounds.height && dim1 < dim2) {
          // width and height tile info is reversed
          [dim1, dim2] = [dim2, dim1];
        }
      }

      post.tags.push(new ScrapedTag(`${dim1}_tiles_wide`, "tile_info"));
      post.tags.push(new ScrapedTag(`${dim2}_tiles_tall`, "tile_info"));
    }
  }
}

export default class Reddit implements ScrapeEngine {
  name = "reddit";

  canImport(url: Location): boolean {
    return url.host.endsWith("reddit.com");
  }

  scrapeDocument(document: Document): ScrapeResult {
    let result = new ScrapeResult(this.name);

    const page_url = new URL(document.location.href);
    var subreddit: string | undefined = undefined;
    var reddit_user: string | undefined = undefined;
    var reddit_post_title: string | null = null;
    if (page_url.pathname.split('/')[1] === 'r' && page_url.pathname.split('/')[2]) {
      subreddit = page_url.pathname.split('/')[2];
    }

    // tags to add to all posts found on page
    var post_add_tags: ScrapedTag[] = [];

    const is_old_reddit: boolean = page_url.host.startsWith("old");

    let post = new ScrapedPost();
    post.pageUrl = document.location.href;
    let postImgPreviewEl: HTMLImageElement | undefined;

    if (is_old_reddit) {
      // For old.reddit.com
      let user_element = document.querySelector(".entry a.author");
      if (user_element) {
        reddit_user = (user_element as HTMLAnchorElement).text;
      }
      const oldLinkElements = document.querySelectorAll("a.title");
      if (oldLinkElements.length > 0) {
        post.contentUrl = (oldLinkElements[0] as HTMLAnchorElement).href;
      }
    }
    else {
      // For new reddit
      let user_element = document.querySelector("div[data-test-id='post-content'] a[data-click-id='user']");
      if (user_element) {
        reddit_user = (user_element as HTMLAnchorElement).text.split('/')[1];
      }
      postImgPreviewEl = document.querySelector(
        "div[data-test-id='post-content'] img.ImageBox-image") as HTMLImageElement | undefined;
      const newLinkEl = postImgPreviewEl?.parentElement;
      if (newLinkEl) {
        post.contentUrl = (newLinkEl as HTMLAnchorElement).href;
      }
      const titleEl = document.querySelector("div[data-test-id='post-content'] h1");
      if (titleEl) reddit_post_title = (titleEl as HTMLHeadingElement).textContent;
    }

    if (post.contentUrl != undefined) {
      post.contentType = guessContentType(post.contentUrl);
    }

    if (reddit_user) post.tags.push(new ScrapedTag(`u/${reddit_user}`, "artist"));

    if (subreddit && isMapSub(subreddit)) {
      getMapTags(document, post, {reddit_post_title, postImgPreviewEl});
    }

    result.tryAddPost(post);

    if (!is_old_reddit) {
      // New reddit: gallery / multi-posts
      const imgEls = Array.from(document.querySelectorAll("div[data-test-id='post-content'] figure a img")).map(
        (x) => {
          return x as HTMLImageElement
        }
      );

      for (const imgEl of imgEls) {
        const imgLink = imgEl.parentElement?.parentElement as HTMLAnchorElement;
        let post = new ScrapedPost();
        post.pageUrl = document.location.href;
        post.contentUrl = imgLink.href;
        post.contentType = guessContentType(post.contentUrl);
        post.referrer = document.location.origin;

        if (reddit_user) post.tags.push(new ScrapedTag(`u/${reddit_user}`, "artist"));
	// if (subreddit) post.tags.push(new ScrapedTag(`r/${subreddit}`));
        
        if (subreddit && isMapSub(subreddit)) {
          getMapTags(document, post, {reddit_post_title, postImgPreviewEl: imgEl});
        }

        result.tryAddPost(post);
      }
    }

    return result;
  }
}
