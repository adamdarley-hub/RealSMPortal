import { createServerWithWebSockets } from '../server/index.ts';

(async () => {
  const backendServer = await createServerWithWebSockets();

  backendServer.listen(5000, () => {
    console.log(`🚀 Backend server with WebSocket support running on port 5000`);
    console.log(`🔧 API: http://localhost:5000/api`);
    console.log(`📡 WebSocket: ws://localhost:5000`);
  });
})();
