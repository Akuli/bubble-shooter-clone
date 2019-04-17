define(['./core.js', '../../js/common.js'], function(core, common) {
  "use strict";

  class UI extends common.UI {
    constructor(gameDiv, bubbleAreaDiv, shooterDiv) {
      super(gameDiv);
      this._bubbleAreaDiv = bubbleAreaDiv;
      this._shooterDiv = shooterDiv;
      this._bubbleElements = new Map();
      this._shooterRadius = shooterDiv.getBoundingClientRect().height / 2;  // this is here for consistency
      this.setShooterAngle(-2*Math.PI/4);   // up
    }

    setShooterAngle(angle) {
      this._correctedShooterAngle = core.correctShootAngle(angle);
      this._shooterDiv.style.transform = `rotate(${this._correctedShooterAngle}rad)`;
    }

    _bubbleCreateCb(bubble) {
      const elem = document.createElement('div');
      elem.style.width = 2*core.BUBBLE_RADIUS + 'px';
      elem.style.height = 2*core.BUBBLE_RADIUS + 'px';
      elem.classList.add('bubble');
      elem.classList.add('bubble' + bubble.colorId);
      this._bubbleAreaDiv.appendChild(elem);
      this._bubbleElements.set(bubble, elem);
      this._bubbleMoveCb(bubble);
    }

    _bubbleMoveCb(bubble) {
      const elem = this._bubbleElements.get(bubble);
      const [ x, y ] = bubble.coords;
      elem.style.left = (x - core.BUBBLE_RADIUS) + 'px';
      elem.style.top = (y - core.BUBBLE_RADIUS) + 'px';
    }

    _bubbleDestroyCb(bubble) {
      const elem = this._bubbleElements.get(bubble);
      if (!this._bubbleElements.delete(bubble)) {
        throw new Error("delete failed: " + bubble);
      }
      elem.parentElement.removeChild(elem);
    }

    newGame() {
      if (this.currentGame !== null) {
        this.currentGame.destroy();
      }

      this.currentGame = new core.Game(this._shooterRadius);
      this.currentGame.addEventListener('BubbleCreate', event => this._bubbleCreateCb(event.bubble));
      this.currentGame.addEventListener('BubbleMove', event => this._bubbleMoveCb(event.bubble));
      this.currentGame.addEventListener('BubbleDestroy', event => this._bubbleDestroyCb(event.bubble));
      this.currentGame.onEventsConnected();
      super.newGame();
    }

    shoot() {
      if (this.currentGame.status === common.GameStatus.PLAYING && !this.currentGame.shotBubbleMoving) {
        this.currentGame.shoot(this._correctedShooterAngle);
      }
    }
  }

  return UI;
});
