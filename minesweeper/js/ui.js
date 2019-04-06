define(['./core.js'], function(core) {
  "use strict";

  const UNICODE_FLAG = '\u2691';
  const UNICODE_ASTERISK = '\u2217';

  class UI {
    constructor(gridDiv) {
      this._gridDiv = gridDiv;
      this._squareElems = {};
      this.currentGame = null;
    }

    newGame() {
      for (const elem of Object.values(this._squareElems)) {
        this._gridDiv.removeChild(elem);
      }
      this._squareElems = {};

      this.currentGame = new core.Game(...arguments);

      for (let x = 0; x < this.currentGame.width; x++) {
        for (let y = 0; y < this.currentGame.height; y++) {
          const elem = document.createElement('div');
          // +1 because grid rows and columns have to start at 1 instead of 0, lel
          elem.style.gridColumn = x+1;
          elem.style.gridRow = y+1;
          elem.classList.add('square');
          elem.addEventListener('click', event => {
            this.currentGame.open([ x, y ]);
            this._updateSquares();
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

        window.asdf = this.currentGame;
      }
    }

    _updateSquares() {
      for (let x = 0; x < this.currentGame.width; x++) {
        for (let y = 0; y < this.currentGame.height; y++) {
          const xy = [ x, y ];

          const squareInfo = this.currentGame.getSquareInfo(xy);

          let opened = false;
          let openedNumber = null;    // null for e.g. mines at end of game, or an integer: 0, 1, 2, ..., 8
          let textContent = "";

          if ((this.currentGame.status === core.GameStatus.PLAYING && squareInfo.opened) ||
              (this.currentGame.status !== core.GameStatus.PLAYING && !squareInfo.mine)) {
            opened = true;
            openedNumber = squareInfo.minesAround;
            textContent += squareInfo.minesAround;
          } else if (this.currentGame.status === core.GameStatus.PLAYING) {
            if (squareInfo.flagged) {
              textContent += UNICODE_FLAG;
            }
          } else {
            // end of game and mine, show it
            opened = true;
            textContent = UNICODE_ASTERISK;
            if (squareInfo.flagged) {
              textContent += UNICODE_FLAG;
            }
          }

          const elem = this._squareElems[xy];
          elem.textContent = textContent;

          if (opened) {
            elem.classList.add('opened');
            if (openedNumber !== null) {
              elem.classList.add('opened' + openedNumber);
            }
          } else {
            elem.classList.remove('opened');
            for (let i = 0; i <= 8; i++) {
              elem.classList.remove('opened' + i);
            }
          }
        }
      }
    }
  }

  return UI;
});
