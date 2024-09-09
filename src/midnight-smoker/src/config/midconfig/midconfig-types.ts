export type MidconfigResult = {
  config: any;
  filepath: string;
  isEmpty?: boolean;
} | null;

type Transform = (result: MidconfigResult) => Promise<MidconfigResult>;

type LoaderResult = unknown;

export type Loader = (
  filepath: string,
  content: string,
) => Promise<LoaderResult>;

export type Loaders = Record<string, Loader>;

export interface MidconfigOptions {
  cache?: boolean;
  ignoreEmptySearchPlaces?: boolean;
  packageProp?: string | string[];
  searchPlaces?: readonly string[] | string[];
  stopDir?: string;
  transform?: Transform;
}

export interface AsyncSearcher {
  clearCaches: () => void;
  clearLoadCache: () => void;
  clearSearchCache: () => void;
  load(filepath: string): Promise<MidconfigResult>;
  search(searchFrom?: string): Promise<MidconfigResult>;
}
