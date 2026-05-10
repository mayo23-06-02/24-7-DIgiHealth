import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token?: string): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      auth: {
        token
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  } else if (token && socket.auth) {
    // Update token if it changed
    (socket.auth as any).token = token;
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
