export type AbortReason = Error | string;

export interface AbortEvent {
  reason?: AbortReason;
  type: 'ABORT';
}
