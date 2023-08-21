export class SmokerError extends Error {
  toJSON() {
    return {
      message: this.message,
      name: this.name,
      stack: this.stack,
    };
  }
}
