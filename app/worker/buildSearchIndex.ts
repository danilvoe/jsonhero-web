export type SearchIndexEntry = {
  path: string;
  label: string;
  description: string;
  rawValue?: string;
  formattedValue?: string;
  isArrayItem: boolean;
  searchBlob: string;
};

export type SearchIndex = {
  paths: string[];
  accessor: PreindexedAccessor;
  pathCount: number;
};

/** Fast primitive formatting for search (avoids inferType per node). */
export function cheapSearchValue(value: unknown): string | undefined {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  return undefined;
}

function lastPathComponent(path: string): string {
  const components = path.split(".");
  return components[components.length - 1] ?? "";
}

function isArrayIndexComponent(component: string): boolean {
  return /^\d+$/.test(component);
}

export class PreindexedAccessor {
  constructor(readonly byPath: Map<string, SearchIndexEntry>) {}

  getIsArrayItem(path: string): boolean {
    return this.byPath.get(path)?.isArrayItem ?? false;
  }

  getItemLabel(path: string): string | undefined {
    return this.byPath.get(path)?.label;
  }

  getItemDescription(path: string): string | undefined {
    return this.byPath.get(path)?.description;
  }

  getItemPath(path: string): string | undefined {
    const description = this.byPath.get(path)?.description;
    return description || undefined;
  }

  getRawValue(path: string): string | undefined {
    return this.byPath.get(path)?.rawValue;
  }

  getFormattedValue(path: string): string | undefined {
    return this.byPath.get(path)?.formattedValue;
  }
}

export function buildSearchIndex(
  json: unknown,
  formatValue: (value: unknown) => string | undefined = cheapSearchValue
): SearchIndex {
  const byPath = new Map<string, SearchIndexEntry>();
  const paths: string[] = [];

  const stack: Array<{ value: unknown; path: string }> = [{ value: json, path: "$" }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const { value, path } = current;
    const label = lastPathComponent(path);
    const descriptionComponents = path.split(".").slice(1, -1);
    const description = descriptionComponents.join(".");
    const isArrayItem = isArrayIndexComponent(label);

    const primitive = formatValue(value);
    const rawValue = primitive;
    const formattedValue = primitive;

    const searchBlob = [label, description, rawValue, formattedValue]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();

    byPath.set(path, {
      path,
      label,
      description,
      rawValue,
      formattedValue,
      isArrayItem,
      searchBlob,
    });
    paths.push(path);

    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i--) {
        stack.push({ value: value[i], path: `${path}.${i}` });
      }
    } else if (typeof value === "object" && value !== null) {
      const keys = Object.keys(value);
      for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i];
        stack.push({
          value: (value as Record<string, unknown>)[key],
          path: `${path}.${key}`,
        });
      }
    }
  }

  return {
    paths,
    accessor: new PreindexedAccessor(byPath),
    pathCount: paths.length,
  };
}

/** Necessary condition for VS Code-style non-contiguous fuzzy match. */
export function mightFuzzyMatch(searchBlob: string, queryLower: string): boolean {
  if (!queryLower) {
    return true;
  }
  if (!searchBlob) {
    return false;
  }

  let fromIndex = 0;
  for (let i = 0; i < queryLower.length; i++) {
    const index = searchBlob.indexOf(queryLower[i], fromIndex);
    if (index === -1) {
      return false;
    }
    fromIndex = index + 1;
  }
  return true;
}

export function getSearchBlob(
  byPath: Map<string, SearchIndexEntry>,
  path: string
): string {
  return byPath.get(path)?.searchBlob ?? "";
}
