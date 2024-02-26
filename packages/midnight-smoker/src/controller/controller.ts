export interface Controller {
  init(): Promise<void>;

  destroy?: () => Promise<void>;

  initialized: boolean;
}
