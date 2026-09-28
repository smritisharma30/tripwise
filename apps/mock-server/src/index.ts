import { createMockServer } from './server.js';

const port = Number(process.env['PORT'] ?? 4000);
const server = createMockServer();

server.listen(port, () => {
  console.log(`[mock-server] listening on http://localhost:${String(port)}`);
});

// Close open streams on Ctrl+C / tsx watch restarts, otherwise the port stays busy.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.closeAllConnections();
    server.close(() => process.exit(0));
  });
}
