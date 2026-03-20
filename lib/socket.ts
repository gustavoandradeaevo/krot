import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io();
  }
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const initSocket = (): Socket => {
  return getSocket();
};
