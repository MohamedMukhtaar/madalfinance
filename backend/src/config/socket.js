import { Server } from 'socket.io';
import env from './index.js';
import jwt from '../utils/jwt.js';

let io = null;

/**
 * Attach Socket.IO to the HTTP server and authenticate each
 * socket using the bearer access token from the handshake.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.cors.clientOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    try {
      const payload = jwt.verifyAccess(token);
      socket.data.user = { id: payload.sub, username: payload.username, role: payload.role };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.id}`);
    socket.join(`role:${socket.data.user.role}`);
  });

  return io;
}

export const getIO = () => io;

/** Emit an event to connected clients (no-op when sockets are disabled). */
export const emitEvent = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

export default { initSocket, getIO, emitEvent };
