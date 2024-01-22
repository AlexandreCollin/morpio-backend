import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { Logger } from '@nestjs/common';
import { MorpioGameService } from './morpio.service';

@WebSocketGateway()
export class MorpioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly morpioGameService: MorpioGameService) {}

  @WebSocketServer()
  server: Server;

  private static readonly logger: Logger = new Logger(MorpioGateway.name);

  handleConnection() {
    MorpioGateway.logger.log('Client connected');
  }

  handleDisconnect() {
    MorpioGateway.logger.log('Client disconnected');
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    MorpioGateway.logger.log(`Message received from ${client.id} : ${data}`);
  }

  @SubscribeMessage('createLobby')
  createLobby(@ConnectedSocket() client: Socket) {
    const lobbyId = this.morpioGameService.createLobby(client);
    MorpioGateway.logger.log(`Creating lobby ${lobbyId}`);
    client.send(JSON.stringify({ event: 'lobbyCreated', data: lobbyId }));
  }

  @SubscribeMessage('joinLobby')
  joinLobby(@ConnectedSocket() client: Socket, @MessageBody() lobbyId: string) {
    MorpioGateway.logger.log(`Joining lobby ${lobbyId}`);
    try {
      this.morpioGameService.joinLobby(client, lobbyId);
    } catch (e) {
      client.send(JSON.stringify({ event: 'error', data: e.message }));
    }
  }
}
