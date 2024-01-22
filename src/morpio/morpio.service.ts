import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export enum CellValue {
  X = 'X',
  O = 'O',
  Empty = '',
}

class Player {
  private readonly socket: Socket;
  private readonly _id: number;
  private readonly _cellValue: CellValue;
  public get cellValue(): CellValue {
    return this._cellValue;
  }
  public get id(): number {
    return this._id;
  }

  constructor(socket: Socket, id: number) {
    this.socket = socket;
    this._id = id;
    this._cellValue = Object.values(CellValue)[id - 1] as CellValue;
  }

  send(message: unknown) {
    this.socket.send(JSON.stringify(message));
  }

  initSocketToPlay(onMessage: (message: unknown) => void) {
    this.socket.on('message', onMessage);
  }
}

class MorpioGame {
  public readonly id: string = uuidv4();
  private players: Player[] = [];
  private readonly maxPlayers: number;
  private playerToPlay: number = 1;
  private readonly gridSize: number;
  private grid: CellValue[][];

  constructor(creator: Socket, maxPlayers: number = 2, gridSize: number = 3) {
    this.maxPlayers = maxPlayers;
    this.addPlayer(creator);
    this.gridSize = gridSize;
    this.grid = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => CellValue.Empty),
    );
  }

  addPlayer(player: Socket) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error('Lobby is full');
    }
    this.players.push(new Player(player, this.players.length + 1));

    if (this.players.length === this.maxPlayers) {
      this.startGame();
    }
  }

  private handlePlayerEvent = (player: Player, message: unknown) => {
    const { event, data } = JSON.parse(message as string);

    if (this.playerToPlay != player.id) return;

    if (event == 'play') {
      const { row, column } = data;
      this.players.forEach((elem) => {
        if (elem.id == this.playerToPlay) return;
        elem.send({
          event: 'play',
          data: { row: row, column: column, cellValue: player.cellValue },
        });
      });
      this.playerToPlay = this.playerToPlay == 1 ? 2 : 1;
    }
  };

  private startGame() {
    this.players.forEach((player, index) => {
      player.send({ event: 'starting', data: Object.values(CellValue)[index] });
      player.initSocketToPlay((message) =>
        this.handlePlayerEvent(player, message),
      );
    });
  }
}

@Injectable()
export class MorpioGameService {
  private readonly games: MorpioGame[] = [];

  createLobby(player1: Socket): string {
    const game = new MorpioGame(player1);
    this.games.push(game);
    return game.id;
  }

  private getGameById(id: string): MorpioGame {
    return this.games.find((game) => game.id === id);
  }

  joinLobby(player: Socket, lobbyId: string) {
    const game = this.getGameById(lobbyId);
    if (game) {
      game.addPlayer(player);
    } else {
      throw new Error('Lobby not found');
    }
  }
}
