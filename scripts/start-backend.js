import { createServerWithWebSockets } from '../server/index.js';

const backendServer = createServerWithWebSockets();

backendServer.listen(3001, () => {
  console.log(`🚀 Backend server with WebSocket support running on port 3001`);
  console.log(`🔧 API: http://localhost:3001/api`);
  console.log(`📡 WebSocket: ws://localhost:3001`);
});
