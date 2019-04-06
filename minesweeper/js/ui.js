define(['./core.js'], function(core) {
  "use strict";

  const UNICODE_FLAG = '\u2691';
  const UNICODE_ASTERISK = '\u2217';

  class UI {
    constructor(gridDiv, statusMessageElem) {
      gridDiv.addEventListener('contextmenu', event => event.preventDefault());   // makes it less annoying
      this._gridDiv = gridDiv;
      this._statusMessageElem = statusMessageElem;
      this._squareElems = {};
      this.currentGame = null;
    }

    _onStatusChanged() {
      if (this.currentGame.status === core.GameStatus.GAME_OVER) {
        this._statusMessageElem.classList.remove('hidden');
        this._statusMessageElem.textContent = "Game Over :(";
      } else if (this.currentGame.status === core.GameStatus.WIN) {
        this._statusMessageElem.textContent = "You win :)";
        this._statusMessageElem.classList.remove('hidden');
      } else if (this.currentGame.status === core.GameStatus.PLAYING) {
        this._statusMessageElem.classList.add('hidden');
      } else {
        throw new Error("unexpected status: " + this.currentGame.status);
      }
    }

    newGame(width, height, mineCount) {
      for (const elem of Object.values(this._squareElems)) {
        this._gridDiv.removeChild(elem);
      }
      this._squareElems = {};
      this._statusMessageElem.classList.add('hidden');

      this.currentGame = new core.Game(width, height, mineCount, (() => this._onStatusChanged()));
      this._onStatusChanged();

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const elem = document.createElement('div');
          const innerSpan = document.createElement('span');
          elem.appendChild(innerSpan);
          // +1 because grid rows and columns have to start at 1 instead of 0, lel
          elem.style.gridColumn = x+1;
          elem.style.gridRow = y+1;
          elem.classList.add('square');

          elem.addEventListener('click', event => {
            this.currentGame.open([ x, y ]);
            this._updateSquares();
            event.preventDefault();
          });
          elem.addEventListener('dblclick', event => {
            this.currentGame.openAroundIfSafe([ x, y ]);
            this._updateSquares()
            event.preventDefault();
          });
          elem.addEventListener('contextmenu', event => {
            this.currentGame.toggleFlag([ x, y ]);
            this._updateSquares();
            event.preventDefault();
          });

          this._squareElems[x + ',' + y] = elem;
          this._gridDiv.appendChild(elem);
        }
      }
    }

    _updateSquares() {
      for (let x = 0; x < this.currentGame.width; x++) {
        for (let y = 0; y < this.currentGame.height; y++) {
          const xy = [ x, y ];

          const squareInfo = this.currentGame.getSquareInfo(xy);

          let mineNumber = null;    // null for e.g. mines at end of game, or an integer: 0, 1, 2, ..., 8
          let textContent = "";

          if ((this.currentGame.status === core.GameStatus.PLAYING && squareInfo.opened) ||
              (this.currentGame.status !== core.GameStatus.PLAYING && !squareInfo.mine)) {
            mineNumber = squareInfo.minesAround;
            textContent += squareInfo.minesAround;
          } else if (this.currentGame.status === core.GameStatus.PLAYING) {
            if (squareInfo.flagged) {
              textContent += UNICODE_FLAG;
            }
          } else {
            // end of game and mine, show it
            textContent = UNICODE_ASTERISK;
            if (squareInfo.flagged) {
              textContent += UNICODE_FLAG;
            }
          }

          const elem = this._squareElems[xy];
          const [ innerSpan ] = elem.childNodes;
          innerSpan.textContent = textContent;

          if (squareInfo.opened) {
            elem.classList.add('opened');
            if (mineNumber !== null) {
              elem.classList.add('number' + mineNumber);
            }
            if (squareInfo.mine) {
              elem.classList.add('openedmine');
            }
          } else {
            elem.classList.remove('opened');
            for (let i = 0; i <= 8; i++) {
              elem.classList.remove('number' + i);
            }
          }
        }
      }
    }
  }

  return UI;
});
