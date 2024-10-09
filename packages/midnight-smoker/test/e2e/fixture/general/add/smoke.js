if (!process.env.FOO) {
  throw new Error('FOO env var not set');
}
