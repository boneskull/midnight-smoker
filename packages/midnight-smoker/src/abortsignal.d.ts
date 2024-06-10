// TODO: remove this when @types/node adds AbortSignal.any

export {};

declare global {
  // eslint-disable-next-line no-var
  var AbortSignal: typeof globalThis extends {
    onmessage: any;
    AbortSignal: infer T;
  }
    ? T
    : {
        prototype: AbortSignal;
        new (): AbortSignal;
        abort(reason?: any): AbortSignal;
        timeout(milliseconds: number): AbortSignal;
        any(signals: AbortSignal[]): AbortSignal;
      };
}
