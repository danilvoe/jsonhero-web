import {
  JSONHeroSearch,
  compareItemsByFuzzyScore,
  prepareQuery,
  scoreItemFuzzy,
  search as searchAll,
} from "@jsonhero/fuzzy-json-search";
import type { ItemScore, PreparedQuery, SearchResult } from "@jsonhero/fuzzy-json-search";

import {
  buildSearchIndex,
  cheapSearchValue,
  mightFuzzyMatch,
  type SearchIndex,
} from "./buildSearchIndex";

export { cheapSearchValue } from "./buildSearchIndex";

/** Below this path count, use the library's full sort (best ranking quality). */
const FULL_SEARCH_PATH_LIMIT = 8_000;
const MAX_RESULTS = 300;

export class FastJsonSearch {
  private searcher: JSONHeroSearch | null = null;
  private index: SearchIndex | null = null;
  private searchCache = new Map<string, Array<SearchResult<string>>>();
  private readonly formatValue: (value: unknown) => string | undefined;

  constructor(formatValue: (value: unknown) => string | undefined = cheapSearchValue) {
    this.formatValue = formatValue;
  }

  prepareIndex(json: unknown): number {
    this.index = buildSearchIndex(json, this.formatValue);
    this.searcher = new JSONHeroSearch(json, {
      cacheSettings: { max: 250, enabled: false },
      accessor: this.index.accessor,
      formatter: this.formatValue,
    });
    this.searcher.items = this.index.paths;
    this.searchCache.clear();
    return this.index.pathCount;
  }

  search(query: string): Array<SearchResult<string>> {
    if (!this.searcher || !this.index) {
      throw new Error("Search index not initialized");
    }

    const cached = this.searchCache.get(query);
    if (cached) {
      return cached;
    }

    const preparedQuery = prepareQuery(query);
    const scoreCache = new Map<number, ItemScore>();
    const results =
      this.index.pathCount <= FULL_SEARCH_PATH_LIMIT
        ? searchAll(
            this.index.paths,
            preparedQuery,
            true,
            this.index.accessor,
            scoreCache
          )
        : searchLargeIndex(
            this.index,
            preparedQuery,
            scoreCache,
            MAX_RESULTS
          );

    this.searchCache.set(query, results);
    if (this.searchCache.size > 250) {
      const oldest = this.searchCache.keys().next().value;
      if (oldest !== undefined) {
        this.searchCache.delete(oldest);
      }
    }

    return results;
  }
}

function searchLargeIndex(
  index: SearchIndex,
  query: PreparedQuery,
  scoreCache: Map<number, ItemScore>,
  maxResults: number
): Array<SearchResult<string>> {
  const { paths, accessor } = index;
  const queryLower = query.normalizedLowercase;
  const top: Array<SearchResult<string>> = [];
  let minScore = 0;

  for (const path of paths) {
    const searchBlob = accessor.byPath.get(path)?.searchBlob ?? "";
    if (!mightFuzzyMatch(searchBlob, queryLower)) {
      continue;
    }

    const score = scoreItemFuzzy(path, query, true, accessor, scoreCache);
    if (score.score <= 0) {
      continue;
    }

    if (top.length < maxResults) {
      top.push({ item: path, score });
      if (top.length === maxResults) {
        minScore = Math.min(...top.map((r) => r.score.score));
      }
      continue;
    }

    if (score.score <= minScore) {
      continue;
    }

    let replaceIndex = 0;
    for (let i = 1; i < top.length; i++) {
      if (top[i].score.score < top[replaceIndex].score.score) {
        replaceIndex = i;
      }
    }

    if (score.score > top[replaceIndex].score.score) {
      top[replaceIndex] = { item: path, score };
      minScore = Math.min(...top.map((r) => r.score.score));
    }
  }

  top.sort((a, b) =>
    compareItemsByFuzzyScore(a.item, b.item, query, true, accessor, scoreCache)
  );
  return top;
}
