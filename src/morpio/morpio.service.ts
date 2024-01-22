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
  private turn: number = 1;
  private readonly winCondition: number = 3;

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

      if (this.grid[row][column] != CellValue.Empty) {
        player.send({
          event: 'illegalPlay',
          data: { row: row, column: column },
        });
        return;
      }

      this.grid[row][column] = player.cellValue;

      this.players.forEach((elem) => {
        if (elem.id == this.playerToPlay) return;
        elem.send({
          event: 'play',
          data: { row: row, column: column, cellValue: player.cellValue },
        });
      });

      if (this.turn >= this.winCondition) {
        if (this.checkWin(row, column)) {
          this.players.forEach((elem) => {
            elem.send({ event: 'gameOver', data: player.cellValue });
          });
        }
      }

      if (this.turn == (this.gridSize * this.gridSize) / 2 + 0.5) {
        this.players.forEach((elem) => {
          elem.send({ event: 'gameOver', data: CellValue.Empty });
        });
      }

      this.turn += 0.5;
      this.playerToPlay = this.playerToPlay == 1 ? 2 : 1;
    }
  };

  private checkLine(row: number, column: number) {
    const cellValue = this.grid[row][column];
    let left: number = column - this.winCondition + 1;
    let right: number = column + this.winCondition - 1;
    let count = 0;

    if (left < 0) {
      left = 0;
    }
    if (right > this.gridSize) {
      right = this.gridSize;
    }

    for (let i = left; i < right; i++) {
      if (this.grid[row][i] == cellValue) {
        count++;
      } else {
        count = 0;
      }
    }

    return count == this.winCondition;
  }

  private checkColumn(row: number, column: number) {
    const cellValue = this.grid[row][column];
    let top: number = row - this.winCondition + 1;
    let bottom: number = row + this.winCondition - 1;
    let count = 0;

    if (top < 0) {
      top = 0;
    }
    if (bottom > this.gridSize) {
      bottom = this.gridSize;
    }

    for (let i = top; i < bottom; i++) {
      if (this.grid[i][column] == cellValue) {
        count++;
      } else {
        count = 0;
      }
    }

    return count == this.winCondition;
  }

  private checkDiagonal(row: number, column: number) {
    const cellValue = this.grid[row][column];
    let top: number = row - this.winCondition + 1;
    let bottom: number = row + this.winCondition - 1;
    let left: number = column - this.winCondition + 1;
    let right: number = column + this.winCondition - 1;
    let countLeftToRight: number = 0;
    let countRightToLeft: number = 0;

    if (top < 0) {
      top = 0;
    }
    if (bottom > this.gridSize) {
      bottom = this.gridSize;
    }
    if (left < 0) {
      left = 0;
    }
    if (right > this.gridSize) {
      right = this.gridSize;
    }

    let i = top;
    let j = left;
    while (i < bottom && j < right) {
      if (this.grid[i][j] == cellValue) {
        countLeftToRight++;
      } else {
        countLeftToRight = 0;
      }
      if (this.grid[i][right - j] == cellValue) {
        countRightToLeft++;
      } else {
        countRightToLeft = 0;
      }
      i++;
      j++;
    }

    return (
      countLeftToRight == this.winCondition ||
      countRightToLeft == this.winCondition
    );
  }

  private checkWin(row: number, column: number): boolean {
    return (
      this.checkLine(row, column) ||
      this.checkColumn(row, column) ||
      this.checkDiagonal(row, column)
    );
  }

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
