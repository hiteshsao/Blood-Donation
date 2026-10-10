import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

let ioInstance = null;

/**
 * Socket.io JWT authentication middleware.
 * Verifies JWT token supplied in handshake auth, headers, query, or cookies.
 * Attaches authenticated user to `socket.user`.
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    let token =
      socket.handshake?.auth?.token ||
      socket.handshake?.query?.token ||
      (socket.handshake?.headers?.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token && socket.handshake?.headers?.cookie) {
      const match = socket.handshake.headers.cookie.match(/(?:accessToken|token)=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      const secret =
        process.env.JWT_ACCESS_SECRET ||
        'blood_donation_super_secure_access_token_secret_key_2026_xyz!';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      if (user.isBlocked || user.status === 'BLOCKED') {
        return next(new Error('Authentication error: Account suspended'));
      }

      socket.user = user;
      return next();
    }

    if (socket.handshake?.auth?.allowAnonymous) {
      return next();
    }

    return next(new Error('Authentication error: JWT token required'));
  } catch (err) {
    return next(new Error(`Authentication error: ${err.message}`));
  }
};

/**
 * Registers connection events and joins per-user room `user:<id>`.
 */
export const handleSocketConnection = (socket) => {
  // Automatically join per-user room if authenticated
  if (socket.user) {
    const userRoom = `user:${socket.user._id.toString()}`;
    socket.join(userRoom);
    console.log(`[Socket.io] Authenticated user ${socket.user._id} connected and joined ${userRoom}`);
  } else {
    console.log(`[Socket.io] Client connected without auth: ${socket.id}`);
  }

  // Join explicit user room (backwards compatibility)
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined user:${userId}`);
    }
  });

  // Join admin room
  socket.on('join_admin_room', () => {
    socket.join('admin');
    console.log(`[Socket.io] Socket ${socket.id} joined admin room`);
  });

  // Join specific emergency request tracking room
  socket.on('join_emergency_room', (emergencyId) => {
    if (emergencyId) {
      socket.join(`emergency:${emergencyId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined emergency:${emergencyId}`);
    }
  });

  // Leave emergency room
  socket.on('leave_emergency_room', (emergencyId) => {
    if (emergencyId) {
      socket.leave(`emergency:${emergencyId}`);
    }
  });

  // Join specific blood request tracking room
  socket.on('join_request_room', (requestId) => {
    if (requestId) {
      socket.join(`request:${requestId}`);
      console.log(`[Socket.io] Socket ${socket.id} joined request:${requestId}`);
    }
  });

  // Leave request room
  socket.on('leave_request_room', (requestId) => {
    if (requestId) {
      socket.leave(`request:${requestId}`);
    }
  });

  // Join blood group room (for emergency broadcasts)
  socket.on('join_group_room', (bloodGroup) => {
    if (bloodGroup) {
      socket.join(`group:${bloodGroup}`);
      console.log(`[Socket.io] Socket ${socket.id} joined group:${bloodGroup}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
};

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true,
    },
  });

  // Register JWT auth middleware
  ioInstance.use(socketAuthMiddleware);

  // Register connection handler
  ioInstance.on('connection', handleSocketConnection);

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

/**
 * Emit real-time event to a specific user's room.
 *
 * @param {string} userId
 * @param {string} event
 * @param {Object} data
 */
export const emitToUser = (userId, event, data) => {
  if (ioInstance && userId) {
    ioInstance.to(`user:${userId.toString()}`).emit(event, data);
  }
};

/**
 * Emit event to an emergency room.
 *
 * @param {string} emergencyId
 * @param {string} event
 * @param {Object} data
 */
export const emitToEmergencyRoom = (emergencyId, event, data) => {
  if (ioInstance && emergencyId) {
    ioInstance.to(`emergency:${emergencyId.toString()}`).emit(event, data);
  }
};

/**
 * Broadcast emergency alert to multiple donor user IDs and group room.
 *
 * @param {Object} emergency
 * @param {string[]} donorUserIds
 */
export const broadcastEmergencyAlert = (emergency, donorUserIds = []) => {
  if (!ioInstance) return;

  const payload = {
    emergencyId: emergency._id,
    patientName: (emergency.patientName || 'Emergency Patient').trim().split(' ')[0],
    bloodGroup: emergency.bloodGroup,
    units: emergency.units,
    city: emergency.city,
    hospitalName: emergency.hospitalName || emergency.hospital?.name || '',
    urgency: emergency.urgency,
    radiusKm: emergency.radiusKm,
    createdAt: emergency.createdAt,
  };

  // Emit to each matched donor's private room
  donorUserIds.forEach((uid) => {
    ioInstance.to(`user:${uid.toString()}`).emit('emergency_alert', payload);
  });

  // Also broadcast to the blood group room
  ioInstance.to(`group:${emergency.bloodGroup}`).emit('emergency_alert', payload);
};
