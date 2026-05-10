import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from './lib/mongodb';
import Message from './lib/models/Message';
import Conversation from './lib/models/Conversation';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const JWT_SECRET = process.env.JWT_SECRET || 'secret123!';

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Attach to global for API routes access
  (global as any).io = io;

  // Ensure DB connection for background tasks
  await connectToDatabase();

  io.use((socket, nextMiddleware) => {
    // Check for token in handshake auth or cookies
    let token = socket.handshake.auth.token;
    
    if (!token && socket.handshake.headers.cookie) {
      const cookies = socket.handshake.headers.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1];
      }
    }

    if (!token) {
      return nextMiddleware(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.user = decoded;
      nextMiddleware();
    } catch (err) {
      console.error('Socket Auth Error:', err);
      nextMiddleware(new Error("Authentication error: Invalid token"));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.userId;
    console.log(`[Socket] User connected: ${userId}`);

    socket.on('join:conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`[Socket] User ${userId} joined room: ${conversationId}`);
    });

    socket.on('send:message', async (data) => {
      const { conversationId, content, type, receiverId, fileUrl, fileMime, recordId } = data;
      
      try {
        const newMessage = await Message.create({
          conversationId,
          senderId: userId,
          receiverId,
          content,
          type,
          fileUrl,
          fileMime,
          recordId,
          isRead: false
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastActivityAt: new Date()
        });

        // Broadcast to others in the conversation
        socket.to(conversationId).emit('new:message', newMessage);
        // Acknowledge to sender
        socket.emit('message:sent', newMessage);
      } catch (err) {
        console.error('[Socket] Error saving message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing:start', (conversationId) => {
      socket.to(conversationId).emit('typing:start', { userId, conversationId });
    });

    socket.on('typing:stop', (conversationId) => {
      socket.to(conversationId).emit('typing:stop', { userId, conversationId });
    });

    socket.on('message:read', async ({ messageId, conversationId }) => {
      try {
        const message = await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          readAt: new Date()
        }, { new: true }).lean();
        
        if (message) {
          socket.to(conversationId).emit('message:read', { 
            messageId, 
            conversationId, 
            readAt: message.readAt 
          });
        }
      } catch (err) {
        console.error('[Socket] Error marking message read:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`);
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
