import { Router } from 'express';

const router = Router();

// Socket.IO test page
router.get('/test', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Socket.IO Test</title>
      <script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
      <style>
        body { font-family: Arial; padding: 20px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
        .log { background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Socket.IO Connection Test</h1>
      <div id="status" class="status disconnected">Disconnected</div>
      <button onclick="connect()">Connect</button>
      <button onclick="disconnect()">Disconnect</button>
      <button onclick="testPing()">Test Ping</button>
      <div class="log">
        <h3>Event Log:</h3>
        <div id="log"></div>
      </div>
      
      <script>
        let socket = null;
        
        function log(msg) {
          const logDiv = document.getElementById('log');
          const time = new Date().toLocaleTimeString();
          logDiv.innerHTML = '<div>[' + time + '] ' + msg + '</div>' + logDiv.innerHTML;
        }
        
        function updateStatus(connected) {
          const status = document.getElementById('status');
          if (connected) {
            status.className = 'status connected';
            status.textContent = 'Connected';
          } else {
            status.className = 'status disconnected';
            status.textContent = 'Disconnected';
          }
        }
        
        function connect() {
          if (socket && socket.connected) {
            log('Already connected');
            return;
          }
          
          socket = io(window.location.origin, {
            query: { userId: 'testuser123' },
            transports: ['polling', 'websocket']
          });
          
          socket.on('connect', () => {
            log('Connected with ID: ' + socket.id);
            updateStatus(true);
          });
          
          socket.on('disconnect', () => {
            log('Disconnected');
            updateStatus(false);
          });
          
          socket.on('connect_error', (error) => {
            log('Connection error: ' + error.message);
          });
          
          socket.on('error', (error) => {
            log('Error: ' + JSON.stringify(error));
          });
          
          socket.on('is_online', (data) => {
            log('Online status: ' + JSON.stringify(data));
          });
        }
        
        function disconnect() {
          if (socket) {
            socket.disconnect();
            log('Disconnected manually');
          }
        }
        
        function testPing() {
          if (socket && socket.connected) {
            socket.emit('join_chat', { roomId: 'test-room' });
            log('Sent join_chat event');
          } else {
            log('Not connected');
          }
        }
        
        // Auto-connect on load
        window.onload = () => {
          log('Page loaded, ready to connect');
          log('Socket.IO library loaded: ' + (typeof io !== 'undefined'));
        };
      </script>
    </body>
    </html>
  `);
});

export default router;