import { GameStatus, GameCore, GameUI } from './game.js';


const allShapes = [
  // 1 point shapes
  {name: 'square1', rotationCount: 1, points: [
    [0, 0],
  ]},

  // 2 point shapes
  {name: 'I2', rotationCount: 2, points: [
    [0, 0],
    [0, 1],
  ]},

  // 3 point shapes
  {name: 'I3', rotationCount: 2, points: [
    [0, -1],
    [0, 0],
    [0, 1],
  ]},
  {name: 'corner2', rotationCount: 4, points: [
    [1, 0],
    [0, 0],
    [0, 1],
  ]},

  // 4 point shapes (classic tetris)
  {name: 'I4', rotationCount: 2, points: [
    [0, -1],
    [0, 0],
    [0, 1],
    [0, 2],
  ]},
  {name: 'S', rotationCount: 2, points: [
    [1, 0],
    [0, 0],
    [0, 1],
    [-1, 1],
  ]},
  {name: 'Z', rotationCount: 2, points: [
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 1],
  ]},
  {name: 'square2', rotationCount: 1, points: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]},
  {name: 'T', rotationCount: 4, points: [
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 0],
  ]},
  {name: 'L', rotationCount: 4, points: [
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 1],
  ]},
  {name: 'J', rotationCount: 4, points: [
    [0, -1],
    [0, 0],
    [0, 1],
    [-1, 1],
  ]},

  // 5 point shapes
  /*
  there are no "tall S" and "tall Z" blocks because they were annoying
     _ _     _ _
    |_|_|   |_|_|
   _|_|       |_|_
  |_|_|       |_|_|
  */
  {name: 'b', rotationCount: 4, points: [
    [0, -1],
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]},
  {name: 'd', rotationCount: 4, points: [
    [1, -1],
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]},
  {name: 'hatLeft', rotationCount: 4, points: [
    [0, -1],
    [0, 0],
    [-1, 0],
    [0, 1],
    [0, 2],
  ]},
  {name: 'hatRight', rotationCount: 4, points: [
    [0, -1],
    [0, 0],
    [1, 0],
    [0, 1],
    [0, 2],
  ]},
  {name: 'U', rotationCount: 4, points: [
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [1, 0],
  ]},
  {name: 'monsterLeft', rotationCount: 4, points: [
    [-1, -1],
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 0],
  ]},
  {name: 'monsterRight', rotationCount: 4, points: [
    [-1, 0],
    [0, 0],
    [0, 1],
    [1, 0],
    [1, -1],
  ]},
  {name: 'Tlong', rotationCount: 4, points: [
    [-1, -1],
    [1, -1],
    [0, -1],
    [0, 0],
    [0, 1],
  ]},
  {name: 'Llong', rotationCount: 4, points: [
    [0, -2],
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 1],
  ]},
  {name: 'Jlong', rotationCount: 4, points: [
    [0, -2],
    [0, -1],
    [0, 0],
    [0, 1],
    [-1, 1],
  ]},
  {name: 'corner3', rotationCount: 4, points: [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ]},
  {name: 'M', rotationCount: 4, points: [
    [-1, -1],
    [0, -1],
    [0, 0],
    [1, 0],
    [1, 1],
  ]},
  /*
  _S is not valid css identifier syntax, but underscoreS is

  S means a block shaped like this
       _ _
     _|_|_|
    |_|_|

  _S means a block shaped like this
       _ _
   _ _|_|_|
  |_|_|_|
  */
  {name: 'underscoreS', rotationCount: 4, points: [
    [1, -1],
    [0, -1],
    [0, 0],
    [-1, 0],
    [-2, 0],
  ]},
  {name: 'Zunderscore', rotationCount: 4, points: [
    [-1, -1],
    [0, -1],
    [0, 0],
    [1, 0],
    [2, 0],
  ]},
  {name: 'I5', rotationCount: 4, points: [
    [0, -2],
    [0, -1],
    [0, 0],
    [0, 1],
    [0, 2],
  ]},
  {name: 'plus', rotationCount: 1, points: [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]},
];


function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

class MovingBlock {
  constructor(gameWidth) {
    this.shape = randomChoice(allShapes);
    this.rotation = 0;

    // -1 makes it look centered for some reason
    this.x = Math.floor(gameWidth/2) - 1;

    // -1 hides it all the way, otherwise creates corner case with game over checking
    this.y = -Math.max(...( this.shape.points.map(([x, y]) => y) )) - 1;
  }

  copy() {
    const copy = Object.create(this.constructor.prototype);   // doesn't call the constructor
    Object.assign(copy, this);
    return copy;
  }

  getCoords() {
    return this.shape.points.map(([x, y]) => {
      switch(this.rotation) {
        case 0: return [x, y];
        case 1: return [y, -x];
        case 2: return [-x, -y];
        case 3: return [-y, x];
        default: throw new Error("unknown rotation: " + this.rotation);
      }
    }).map(([x, y]) => [this.x + x, this.y + y]);
  }
}


function zip(a, b) {
  if (a.length !== b.length) {
    throw new Error("Oh No");
  }
  return a.map((item, index) => [item, b[index]]);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  return zip(a, b).every(([itemA, itemB]) => (itemA === itemB));
}

class TetrisCloneCore extends GameCore {
  constructor(width, height, initialLevel) {
    super();
    this.width = width;
    this.height = height;
    this._initialLevel = initialLevel;
    this._landedSquares = Array(height).fill().map(() => Array(width).fill(null));
    this._movingBlock = new MovingBlock(this.width);
    this.blocksAttached = 0;
  }

  _getShapeName(x, y) {
    if (this._landedSquares[y][x] !== null) {
      return this._landedSquares[y][x];
    }
    if (this._movingBlock !== null &&
        this._movingBlock.getCoords().find(point => arraysEqual(point, [x, y])) !== undefined)
    {
      return this._movingBlock.shape.name;
    }
    return null;
  }

  _doChangeEvents(points) {
    for (const [x, y] of points) {
      const event = new Event('SquareChanged');
      event.x = x;
      event.y = y;
      event.newShapeName = this._getShapeName(x, y);
      this.dispatchEvent(event);
    }
  }

  _attachBlock() {
    for (const [x, y] of this._movingBlock.getCoords()) {
      this._landedSquares[y][x] = this._movingBlock.shape.name;
    }
    this._movingBlock = null;

    const oldLevel = this.getLevel();
    this.blocksAttached++;

    this.dispatchEvent(new Event('BlockAttached'));
    if (this.getLevel() !== oldLevel) {
      this.dispatchEvent(new Event('LevelChanged'));
    }
  }

  _setMovingBlockIfPossible(movingBlockCopy) {
    if (this.status !== GameStatus.PLAYING) {
      throw new Error("expected playing status");
    }

    for (const [x, y] of movingBlockCopy.getCoords()) {
      // negative y allowed, it means moving block has not went very far down yet
      if (x < 0 ||
          x >= this.width ||
          y >= this.height ||
          (y >= 0 && this._landedSquares[y][x] !== null))
      {
        return false;
      }
    }

    const changePoints =
      this._movingBlock.getCoords()
      .concat(movingBlockCopy.getCoords())
      .filter(([x, y]) => (y >= 0));

    this._movingBlock = movingBlockCopy;
    this._doChangeEvents(changePoints);
    return true;
  }

  moveHorizontally(xDelta) {
    if (this.status !== GameStatus.PLAYING) {
      return;
    }

    const movingBlockCopy = this._movingBlock.copy();
    movingBlockCopy.x += xDelta;
    this._setMovingBlockIfPossible(movingBlockCopy);
  }

  rotate() {
    if (this.status !== GameStatus.PLAYING) {
      return;
    }

    const movingBlockCopy = this._movingBlock.copy();
    movingBlockCopy.rotation = (movingBlockCopy.rotation + 1) % movingBlockCopy.shape.rotationCount;
    this._setMovingBlockIfPossible(movingBlockCopy);
  }

  _wipeFullLines() {
    // this works when there are multiple full lines (after each other or nully lines between)
    for (let y = 0; y < this.height; y++) {
      if (!this._landedSquares[y].includes(null)) {
        const landedSquaresCopy = [...this._landedSquares];
        this._landedSquares.splice(y, 1);
        this._landedSquares.unshift(Array(this.width).fill(null));

        const changePoints = [];
        for (let changeX = 0; changeX < this.width; changeX++) {
          for (let changeY = 0; changeY < this.height; changeY++) {
            if (this._landedSquares[changeY][changeX] !== landedSquaresCopy[changeY][changeX]) {
              changePoints.push([changeX, changeY]);
            }
          }
        }
        this._doChangeEvents(changePoints);
      }
    }
  }

  _moveDownIfPossible() {
    const movingBlockCopy = this._movingBlock.copy();
    movingBlockCopy.y++;
    return this._setMovingBlockIfPossible(movingBlockCopy);
  }

  _movingBlockIsFullyInGameArea() {
    return this._movingBlock.getCoords().every(([x, y]) => (y >= 0));
  }

  moveDown(timeouted) {
    if (this.status !== GameStatus.PLAYING) {
      return false;
    }

    const itActuallyMoved = this._moveDownIfPossible();
    if (timeouted && !itActuallyMoved) {
      if (this._movingBlockIsFullyInGameArea()) {
        this._attachBlock();
        this._wipeFullLines();
        this._movingBlock = new MovingBlock(this.width);
      } else {
        this.status = GameStatus.GAME_OVER;
      }
    }
    return itActuallyMoved;
  }

  getLevel() {
    return this._initialLevel + Math.floor(this.blocksAttached / 50);
  }

  // returns milliseconds
  getTimeout() {
    const blocksPerSecond = this.getLevel() + 1;   // 2, 3, 4, ...
    return 1000 / blocksPerSecond;
  }
}


class TetrisCloneUI extends GameUI {
  constructor(gameDiv, statusBarElem) {
    super(gameDiv);
    this._statusBarElem = statusBarElem;
    this._squareElems = {};
    this._intervalId = null;
  }

  _clearInterval() {
    if (this._intervalId !== null) {
      window.clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  _setInterval() {
    this._clearInterval();
    this._intervalId = window.setInterval(
      () => this.currentGame.moveDown(true),
      this.currentGame.getTimeout());
  }

  _updateStatusBar() {
    this._statusBarElem.textContent =
      `Level ${this.currentGame.getLevel()}, ${this.currentGame.blocksAttached} blocks landed`
  }

  newGame(width, height, initialLevel) {
    for (const elem of Object.values(this._squareElems)) {
      this.gameDiv.removeChild(elem);
    }
    this._squareElems = {};

    this.currentGame = new TetrisCloneCore(width, height, initialLevel);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const elem = document.createElement('div');

        // +1 because grid rows and columns have to start at 1 instead of 0, lel
        elem.style.gridColumn = x+1;
        elem.style.gridRow = y+1;
        elem.classList.add('square');
        elem.classList.add('shape-null');

        this._squareElems[x + ',' + y] = elem;
        this.gameDiv.appendChild(elem);
      }
    }

    this.currentGame.addEventListener('SquareChanged', event => {
      const elem = this._squareElems[event.x + ',' + event.y];
      const oldClass = [...elem.classList].find(klass => klass.startsWith('shape-'));
      elem.classList.remove(oldClass);
      // event.newShapeName may be null
      elem.classList.add('shape-' + event.newShapeName);
    });

    this.currentGame.addEventListener('BlockAttached', event => {
      this._updateStatusBar();
    });
    this.currentGame.addEventListener('LevelChanged', () => this._setInterval());
    this.currentGame.addEventListener('StatusChanged', () => this._clearInterval());

    this._updateStatusBar();
    this._setInterval();

    super.newGame();
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');
  const initialLevelInput = document.getElementById('initial-level-input');

  const newGameButton = document.getElementById('new-game-button');
  const gameDiv = document.getElementById('game');
  const statusBarSpan = document.getElementById('game-statusbar');

  const allInputs = [ widthInput, heightInput, initialLevelInput ];
  for (const input of allInputs) {
    input.addEventListener('input', () => {
      newGameButton.disabled = !allInputs.every(input => input.validity.valid);
    });
  }

  const ui = new TetrisCloneUI(gameDiv, statusBarSpan);

  function startNewGame() {
    ui.newGame(+widthInput.value, +heightInput.value, +initialLevelInput.value);
  }

  newGameButton.addEventListener('click', startNewGame);
  startNewGame();

  window.addEventListener('keydown', event => {
    if (ui.currentGame === null || ui.currentGame.status !== GameStatus.PLAYING) {
      return;
    }

    switch(event.key) {
      case 'ArrowLeft':
        ui.currentGame.moveHorizontally(-1);
        break;
      case 'ArrowRight':
        ui.currentGame.moveHorizontally(+1);
        break;
      case 'ArrowDown':
        while (ui.currentGame.moveDown(false)) { }
        break;
      case 'ArrowUp':
        ui.currentGame.rotate();
        break;
      default:
        return;
    }

    event.preventDefault();
  });
});
