define(['../../js/common.js'], function(common) {
  "use strict";

  class Game extends common.Core {
    constructor(width, height, mineCount) {
      super();
      if (mineCount > width*height - 1) {
        throw new Error("too many mines");
      }

      this.width = width;
      this.height = height;
      this.mineCount = mineCount;

      this._map = {};   // { "x,y": { opened: boolean, mine: boolean, flagged: boolean } }
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          this._map[x + ',' + y] = { opened: false, mine: false, flagged: false };
        }
      }

      this._minesAdded = false;
    }

    _getNeighbors(xy) {
      const [ x, y ] = xy;
      const possibleNeighbors = [
        [x-1, y-1],
        [x-1, y  ],
        [x-1, y+1],
        [x,   y+1],
        [x+1, y+1],
        [x+1, y  ],
        [x+1, y-1],
        [x,   y-1],
      ];
      return possibleNeighbors.filter(neighbor => {
        const [ nx, ny ] = neighbor;   // nx = neighbor x, ny = neighbor y
        return (0 <= nx && nx < this.width && 0 <= ny && ny < this.height);
      });
    }

    _countNeighborMines(xy) {
      let result = 0;
      for (const neighbor of this._getNeighbors(xy)) {
        if (this._map[neighbor].mine) {
          result++;
        }
      }
      return result;
    }

    getSquareInfo(xy) {
      return {
        opened: this._map[xy].opened,
        mine: this._map[xy].mine,
        flagged: this._map[xy].flagged,
        minesAround: this._countNeighborMines(xy),
      };
    }

    _addMines() {
      let mined = 0;
      while (mined < this.mineCount) {
        const x = Math.floor(Math.random() * this.width);
        const y = Math.floor(Math.random() * this.height);
        const square = this._map[x + ',' + y];
        if (!square.opened && !square.mine) {
          square.mine = true;
          mined++;
        }
      }
   }

    _openRecurser(xy) {
      if (this._map[xy].opened) {
        return;
      }

      this._map[xy].opened = true;
      if (!this._minesAdded) {
        this._addMines();
        this._minesAdded = true;
      }

      if (this._map[xy].mine) {
        this.status = common.GameStatus.GAME_OVER;
      } else if (this._countNeighborMines(xy) === 0) {
        for (const neighbor of this._getNeighbors(xy)) {
          this._openRecurser(neighbor);
        }
      }
    }

    open(xy) {
      if (this.status !== common.GameStatus.PLAYING || this._map[xy].flagged) {
        return;
      }

      this._openRecurser(xy);
      if (this.status === common.GameStatus.GAME_OVER) {
        return;
      }
      if (this.status !== common.GameStatus.PLAYING) {
        throw new Error("unexpected status: " + this.status);
      }

      // try to find a non-mine, non-opened square, player won if there are none
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const square = this._map[x + ',' + y];
          if (!square.mine && !square.opened) {
            return;
          }
        }
      }
      this.status = common.GameStatus.WIN;
    }

    toggleFlag(xy) {
      if (this.status !== common.GameStatus.PLAYING || this._map[xy].opened) {
        return;
      }
      this._map[xy].flagged = !this._map[xy].flagged;
    }

    openAroundIfSafe(xy) {
      if (this.status !== common.GameStatus.PLAYING || !this._map[xy].opened) {
        return;
      }

      let neighborMines = 0;
      let neighborFlags = 0;
      for (const neighbor of this._getNeighbors(xy)) {
        if (this._map[neighbor].mine) {
          neighborMines++;
        }
        if (this._map[neighbor].flagged) {
          neighborFlags++;
        }
      }

      if (neighborMines === neighborFlags) {
        for (const neighbor of this._getNeighbors(xy)) {
          this.open(neighbor);
        }
      }
    }
  }

  return {
    Game: Game,
  };
});
