import { correctShootAngle, BUBBLE_RADIUS, BubbleShooterCore } from './core.js';
import { GameUI, GameStatus } from '../../common/js/game.js';


export class BubbleShooterUI extends GameUI {
  constructor(gameDiv, bubbleAreaDiv, shooterDiv) {
    super(gameDiv);
    this._bubbleAreaDiv = bubbleAreaDiv;
    this._shooterDiv = shooterDiv;
    this._bubbleElements = new Map();
    this._shooterRadius = shooterDiv.getBoundingClientRect().height / 2;  // this is here for consistency
    this.setShooterAngle(-2*Math.PI/4);   // up
  }

  setShooterAngle(angle) {
    this._correctedShooterAngle = correctShootAngle(angle);
    this._shooterDiv.style.transform = `rotate(${this._correctedShooterAngle}rad)`;
  }

  _bubbleCreateCb(bubble) {
    const elem = document.createElement('div');
    elem.style.width = 2*BUBBLE_RADIUS + 'px';
    elem.style.height = 2*BUBBLE_RADIUS + 'px';
    elem.classList.add('bubble');
    elem.classList.add('bubble' + bubble.colorId);
    elem.classList.add('invisible');   // for css animations
    this._bubbleAreaDiv.appendChild(elem);
    this._bubbleElements.set(bubble, elem);
    this._bubbleMoveCb(bubble);

    // this needs a timeout for some reason
    setTimeout((() => elem.classList.remove('invisible')), 50);
  }

  _bubbleMoveCb(bubble) {
    const elem = this._bubbleElements.get(bubble);
    const [ x, y ] = bubble.coords;
    elem.style.left = (x - BUBBLE_RADIUS) + 'px';
    elem.style.top = (y - BUBBLE_RADIUS) + 'px';
  }

  _bubbleAttachedCb(bubble) {
    this._bubbleElements.get(bubble).classList.add('attached');
  }

  _bubbleDestroyCb(bubble) {
    const elem = this._bubbleElements.get(bubble);
    if (!this._bubbleElements.delete(bubble)) {
      throw new Error("delete failed: " + bubble);
    }

    // this is not just elem.parentElement.removeChild(elem) because css animations
    elem.classList.add('invisible');
    window.setTimeout(1000, () => elem.parentElement.removeChild(elem));
  }

  newGame() {
    if (this.currentGame !== null) {
      this.currentGame.destroy();
    }

    this.currentGame = new BubbleShooterCore(this._shooterRadius);
    this.currentGame.addEventListener('BubbleCreate', event => this._bubbleCreateCb(event.bubble));
    this.currentGame.addEventListener('BubbleMove', event => this._bubbleMoveCb(event.bubble));
    this.currentGame.addEventListener('BubbleAttached', event => this._bubbleAttachedCb(event.bubble));
    this.currentGame.addEventListener('BubbleDestroy', event => this._bubbleDestroyCb(event.bubble));
    this.currentGame.onEventsConnected();
    super.newGame();
  }

  shoot() {
    if (this.currentGame.status === GameStatus.PLAYING && !this.currentGame.shotBubbleMoving) {
      this.currentGame.shoot(this._correctedShooterAngle);
    }
  }
}
