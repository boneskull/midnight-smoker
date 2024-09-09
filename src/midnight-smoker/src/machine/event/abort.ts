export interface AbortEvent {
  reason?: Error | string;
  type: 'ABORT';
}
