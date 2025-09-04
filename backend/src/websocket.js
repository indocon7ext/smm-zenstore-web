const WebSocket = require('ws');
const { prisma } = require('../lib/prisma');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map to store client connections by userId
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection established');

      // Handle client authentication and subscription
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          
          switch (data.type) {
            case 'AUTHENTICATE':
              await this.handleAuthentication(ws, data);
              break;
            
            case 'SUBSCRIBE_TO_ORDERS':
              this.handleOrderSubscription(ws, data);
              break;
            
            case 'SUBSCRIBE_TO_NOTIFICATIONS':
              this.handleNotificationSubscription(ws, data);
              break;
            
            case 'PING':
              ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
              break;
            
            default:
              ws.send(JSON.stringify({ 
                type: 'ERROR', 
                message: 'Unknown message type' 
              }));
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ 
            type: 'ERROR', 
            message: 'Invalid message format' 
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleClientDisconnect(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleClientDisconnect(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'WebSocket connection established',
        timestamp: Date.now()
      }));
    });
  }

  async handleAuthentication(ws, data) {
    try {
      const { userId, token } = data;
      
      if (!userId) {
        ws.send(JSON.stringify({
          type: 'AUTH_ERROR',
          message: 'User ID is required'
        }));
        return;
      }

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true }
      });

      if (!user) {
        ws.send(JSON.stringify({
          type: 'AUTH_ERROR',
          message: 'User not found'
        }));
        return;
      }

      if (!user.isActive) {
        ws.send(JSON.stringify({
          type: 'AUTH_ERROR',
          message: 'Account is suspended'
        }));
        return;
      }

      // Store client connection
      this.clients.set(userId, ws);
      ws.userId = userId;

      ws.send(JSON.stringify({
        type: 'AUTHENTICATED',
        message: 'Authentication successful',
        userId: userId
      }));

      console.log(`User ${userId} authenticated via WebSocket`);

    } catch (error) {
      console.error('WebSocket authentication error:', error);
      ws.send(JSON.stringify({
        type: 'AUTH_ERROR',
        message: 'Authentication failed'
      }));
    }
  }

  handleOrderSubscription(ws, data) {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Authentication required'
      }));
      return;
    }

    ws.subscribedToOrders = true;
    ws.send(JSON.stringify({
      type: 'SUBSCRIBED',
      message: 'Subscribed to order updates',
      subscription: 'orders'
    }));
  }

  handleNotificationSubscription(ws, data) {
    if (!ws.userId) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Authentication required'
      }));
      return;
    }

    ws.subscribedToNotifications = true;
    ws.send(JSON.stringify({
      type: 'SUBSCRIBED',
      message: 'Subscribed to notifications',
      subscription: 'notifications'
    }));
  }

  handleClientDisconnect(ws) {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      console.log(`User ${ws.userId} disconnected from WebSocket`);
    }
  }

  // Broadcast order update to specific user
  broadcastOrderUpdate(userId, orderData) {
    const client = this.clients.get(userId);
    if (client && client.subscribedToOrders && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'ORDER_UPDATE',
          data: orderData,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error sending order update:', error);
        this.handleClientDisconnect(client);
      }
    }
  }

  // Broadcast notification to specific user
  broadcastNotification(userId, notificationData) {
    const client = this.clients.get(userId);
    if (client && client.subscribedToNotifications && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'NOTIFICATION',
          data: notificationData,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error sending notification:', error);
        this.handleClientDisconnect(client);
      }
    }
  }

  // Broadcast to all connected clients (for admin updates)
  broadcastToAll(message) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting to client:', error);
          this.handleClientDisconnect(client);
        }
      }
    });
  }

  // Broadcast admin dashboard update
  broadcastAdminUpdate(adminData) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client.isAdmin) {
        try {
          client.send(JSON.stringify({
            type: 'ADMIN_UPDATE',
            data: adminData,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error sending admin update:', error);
          this.handleClientDisconnect(client);
        }
      }
    });
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get connected users list
  getConnectedUsers() {
    return Array.from(this.clients.keys());
  }

  // Health check
  healthCheck() {
    return {
      connectedClients: this.getConnectedClientsCount(),
      connectedUsers: this.getConnectedUsers(),
      serverTime: new Date().toISOString()
    };
  }
}

module.exports = WebSocketServer;
