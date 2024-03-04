export interface Controller {
  init(): Promise<void>;

  [Symbol.dispose]?(): void;
  [Symbol.asyncDispose]?(): Promise<void>;
}
