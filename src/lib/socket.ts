import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    fetch("/api/socketio").finally(() => {});
    socket = io({ path: "/api/socketio", addTrailingSlash: false });
  }
  return socket;
}
