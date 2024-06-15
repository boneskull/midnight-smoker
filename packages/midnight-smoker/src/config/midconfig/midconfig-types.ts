export type MidconfigResult = null | {
  filepath: string;
  config: any;
  isEmpty?: boolean;
};

type Transform = (result: MidconfigResult) => Promise<MidconfigResult>;

type LoaderResult = unknown;

export type Loader = (
  filepath: string,
  content: string,
) => Promise<LoaderResult>;

export type Loaders = Record<string, Loader>;

export interface MidconfigOptions {
  cache?: boolean;
  stopDir?: string;
  searchPlaces?: string[] | readonly string[];
  ignoreEmptySearchPlaces?: boolean;
  packageProp?: string | string[];
  transform?: Transform;
}

export interface AsyncSearcher {
  search(searchFrom?: string): Promise<MidconfigResult>;
  load(filepath: string): Promise<MidconfigResult>;
  clearLoadCache: () => void;
  clearSearchCache: () => void;
  clearCaches: () => void;
}
