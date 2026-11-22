import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { parse } from 'cookie';
import type { Server, Socket } from 'socket.io';
import { SESSION_COOKIE } from '../auth/auth.constants';
import { findSessionUser } from '../auth/session-user';
import { PrismaService } from '../prisma/prisma.service';

// What the server can send. Every event only says "this changed, ask
// again": the data itself is always read over REST, where the ownership
// checks live. Clients send nothing over the socket.
interface ServerEvents {
  messages: () => void;
}
interface SocketData {
  userId: string;
  sessionId: string;
}
type AppServer = Server<object, ServerEvents, object, SocketData>;
type AppSocket = Socket<object, ServerEvents, object, SocketData>;
export type RealtimeEvent = keyof ServerEvents;

// One room per user (all their tabs and devices) and one per login session.
const userRoom = (id: string) => `user:${id}`;
const sessionRoom = (id: string) => `session:${id}`;

// The live channel next to the REST api, at /socket.io on the same port.
// Signed-in users connect with their session cookie; services call notify()
// after a change and the browsers concerned ask the api again.
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() private readonly server!: AppServer;

  constructor(private readonly prisma: PrismaService) {}

  // Runs during the handshake, before the connection exists: a refused
  // client gets a connect_error and never connects. Same rules as the HTTP
  // session guard, plus no socket until a forced password change is done.
  afterInit(server: AppServer) {
    server.use((socket, next) => {
      const cookies = parse(socket.handshake.headers.cookie ?? '');
      const sessionId = cookies[SESSION_COOKIE];
      findSessionUser(this.prisma, sessionId).then((user) => {
        if (!user || !sessionId || user.mustChangePassword) {
          return next(new Error('UNAUTHORIZED'));
        }
        socket.data = { userId: user.id, sessionId };
        next();
      }, next);
    });
  }

  async handleConnection(socket: AppSocket) {
    const { userId, sessionId } = socket.data;
    await socket.join([userRoom(userId), sessionRoom(sessionId)]);
  }

  // Tells these users' open tabs that something changed.
  notify(userIds: string[], event: RealtimeEvent) {
    // An empty room list would mean "everyone" to Socket.IO.
    if (userIds.length === 0) return;
    this.server.to(userIds.map(userRoom)).emit(event);
  }

  // Closes every socket of a user (deactivated, deleted, password reset), or
  // all but one login's (the user changed their own password there).
  disconnectUser(userId: string, exceptSessionId?: string) {
    const sockets = this.server.in(userRoom(userId));
    (exceptSessionId
      ? sockets.except(sessionRoom(exceptSessionId))
      : sockets
    ).disconnectSockets(true);
  }

  // Closes the sockets of one login (logout).
  disconnectSession(sessionId: string) {
    this.server.in(sessionRoom(sessionId)).disconnectSockets(true);
  }
}
