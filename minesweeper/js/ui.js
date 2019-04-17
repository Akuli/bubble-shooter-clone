define(['./core.js', '../../js/common.js'], function(core, common) {
  "use strict";

  const UNICODE_FLAG = '\u2691';
  const UNICODE_ASTERISK = '\u2217';

  class UI extends common.UI {
    constructor(gameDiv, statusBarElem) {
      super(gameDiv);
      gameDiv.addEventListener('contextmenu', event => event.preventDefault());   // makes it less annoying
      this._statusBarElem = statusBarElem;
      this._squareElems = {};
    }

    newGame(width, height, mineCount) {
      for (const elem of Object.values(this._squareElems)) {
        this.gameDiv.removeChild(elem);
      }
      this._squareElems = {};

      this.currentGame = new core.Game(width, height, mineCount);

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
          this.gameDiv.appendChild(elem);
        }
      }

      this._updateSquares();
      super.newGame();
    }

    // TODO: should be implemented with callbacks instead of a huge updater function
    _updateSquares() {
      let flagsTotal = 0;

      for (let x = 0; x < this.currentGame.width; x++) {
        for (let y = 0; y < this.currentGame.height; y++) {
          const xy = [ x, y ];

          const squareInfo = this.currentGame.getSquareInfo(xy);

          if (squareInfo.flagged) {
            flagsTotal++;
          }

          let mineNumber = null;    // null for e.g. mines at end of game, or an integer: 0, 1, 2, ..., 8
          let textContent = "";

          if ((this.currentGame.status === common.GameStatus.PLAYING && squareInfo.opened) ||
              (this.currentGame.status !== common.GameStatus.PLAYING && !squareInfo.mine)) {
            mineNumber = squareInfo.minesAround;
            textContent += squareInfo.minesAround;
          } else if (this.currentGame.status === common.GameStatus.PLAYING) {
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

      this._statusBarElem.textContent = `${flagsTotal}/${this.currentGame.mineCount} mines flagged`;
    }
  }

  return UI;
});
