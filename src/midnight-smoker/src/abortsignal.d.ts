// TODO: remove this when @types/node adds AbortSignal.any

export {};

declare global {
  // eslint-disable-next-line no-var
  var AbortSignal: typeof globalThis extends {
    AbortSignal: infer T;
    onmessage: any;
  }
    ? T
    : {
        abort(reason?: any): AbortSignal;
        any(signals: AbortSignal[]): AbortSignal;
        new (): AbortSignal;
        prototype: AbortSignal;
        timeout(milliseconds: number): AbortSignal;
      };
}
