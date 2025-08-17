import { createServerWithWebSockets } from '../server/index.ts';

(async () => {
  const backendServer = await createServerWithWebSockets();

  backendServer.listen(3001, () => {
    console.log(`🚀 Backend server with WebSocket support running on port 3001`);
    console.log(`🔧 API: http://localhost:3001/api`);
    console.log(`📡 WebSocket: ws://localhost:3001`);
  });
})();
