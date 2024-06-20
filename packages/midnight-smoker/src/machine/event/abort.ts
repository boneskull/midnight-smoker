export interface AbortEvent {
  type: 'ABORT';
  reason?: Error | string;
}
