document.addEventListener('DOMContentLoaded', function() {
  "use strict";

  const SHOOTER_RADIUS = 40;

  const gameDiv = document.getElementById('game');
  const bubbleAreaDiv = document.getElementById('game-bubble-area');
  const shooterDiv = document.getElementById('game-shooter');
  const statusMessageP = document.getElementById('game-status-message');
  const newGameButton = document.getElementById('new-game-button');

  const bubbleElements = new Map();
  let shooterAngle = -2*Math.PI/4;   // up

  require(["./js/core.js"], core => {
    bubbleAreaDiv.addEventListener('mousemove', event => {
      const shooterRect = shooterDiv.getBoundingClientRect();
      const shooterCenterX = (shooterRect.left + shooterRect.right)/2;
      const shooterCenterY = (shooterRect.top + shooterRect.bottom)/2;
      const xDiff = event.clientX - shooterCenterX;
      const yDiff = event.clientY - shooterCenterY;
      shooterAngle = core.correctShootAngle(Math.atan2(yDiff, xDiff));
      shooterDiv.style.transform = 'rotate(' + (shooterAngle) + 'rad)';
    });

    bubbleAreaDiv.style.width = core.WIDTH + 'px';
    bubbleAreaDiv.style.height = core.HEIGHT + 'px';
    shooterDiv.style.marginTop = core.HEIGHT + 'px';
    const shooterRadius = shooterDiv.getBoundingClientRect().height / 2;

    function bubbleCreateCb(bubble) {
      const elem = document.createElement('div');
      elem.style.width = 2*core.BUBBLE_RADIUS + 'px';
      elem.style.height = 2*core.BUBBLE_RADIUS + 'px';
      elem.classList.add('bubble');
      elem.classList.add('bubble' + bubble.colorId);
      bubbleAreaDiv.appendChild(elem);
      bubbleElements.set(bubble, elem);
      bubbleMoveCb(bubble);
    }

    function bubbleMoveCb(bubble) {
      const elem = bubbleElements.get(bubble);
      const [ x, y ] = bubble.coords;
      elem.style.left = (x - core.BUBBLE_RADIUS) + 'px';
      elem.style.top = (y - core.BUBBLE_RADIUS) + 'px';
    }

    function bubbleDestroyCallback(bubble) {
      const elem = bubbleElements.get(bubble);
      if (!bubbleElements.delete(bubble)) {
        throw new Error("delete failed: " + bubble);
      }
      elem.parentElement.removeChild(elem);
    }

    let game = null;

    function statusChangedCallback() {
      if (game.status === core.GameStatus.PLAYING) {
        statusMessageP.classList.add('hidden');
      } else {
        statusMessageP.classList.remove('hidden');
        if (game.status === core.GameStatus.GAME_OVER) {
          statusMessageP.textContent = "Game over :(";
        } else if (game.status === core.GameStatus.WIN) {
          statusMessageP.textContent = "You win :)";
        } else {
          throw new Error("unknown status: " + game.status);
        }
      }
    }

    function newGame() {
      if (game !== null) {
        game.destroy();
      }
      game = new core.Game(shooterRadius, bubbleCreateCb, bubbleMoveCb, bubbleDestroyCallback, statusChangedCallback);
    }

    newGameButton.addEventListener('click', () => newGame());
    gameDiv.addEventListener('click', event => {
      if (game.status === core.GameStatus.PLAYING && !game.shotBubbleMoving) {
        game.shoot(shooterAngle);
      }
    });
    newGame();
  });
});
