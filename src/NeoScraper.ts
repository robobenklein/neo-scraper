import { ScrapeEngine, ScrapeResults, } from './ScrapeEngine';
import * as engines from "./engines";

export default class NeoScraper {
    engines: ScrapeEngine[] = [];
    fallbackEngine: ScrapeEngine | null = null;

    constructor(useDefaultEngines: boolean = true) {
        if (useDefaultEngines) {
            this.engines.push(
                new engines.Danbooru(),
                new engines.Gelbooru(),
                new engines.Moebooru(),
                new engines.Reddit(),
                new engines.SankakuComplex(),
                new engines.Shimmie2(),
                new engines.Twitter(),
                new engines.Zerochan(),
            );
            this.fallbackEngine = new engines.Fallback();
        }
    }

    scrapeDocument(document: Document, engines: string[] | null = null, allowFallbackEngine: boolean = false, ignoreCanImport: boolean = false): ScrapeResults {
        let res = new ScrapeResults();

        for (const engine of this.engines) {
            if (ignoreCanImport || engine.canImport(document.location)) {
                res.results.push(engine.scrapeDocument(document));
            }
        }

        if (allowFallbackEngine) {
            if (!this.fallbackEngine) {
                console.error("NeoScraper.fallbackEngine is unset!");
            } else {
                res.results.push(this.fallbackEngine.scrapeDocument(document));
            }
        }

        return res;
    }
}
