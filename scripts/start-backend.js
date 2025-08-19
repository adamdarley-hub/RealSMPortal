import { createServerWithWebSockets } from '../server/index.ts';

(async () => {
  const backendServer = await createServerWithWebSockets();

  backendServer.listen(8081, () => {
    console.log(`🚀 Backend server with WebSocket support running on port 8081`);
    console.log(`🔧 API: http://localhost:8081/api`);
    console.log(`📡 WebSocket: ws://localhost:8081`);
  });
})();
