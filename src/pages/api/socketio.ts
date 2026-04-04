import type { NextApiRequest, NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";

interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithServer extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithServer;
}

declare global {
  // eslint-disable-next-line no-var
  var socketio: SocketIOServer | undefined;
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    res.socket.server.io = io;
    globalThis.socketio = io;

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("join:household", (householdId: string) => {
        socket.join(`household:${householdId}`);
      });

      socket.on("ping", () => {
        socket.emit("pong");
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });
  }

  res.end();
}
