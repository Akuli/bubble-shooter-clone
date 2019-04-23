import { WIDTH, HEIGHT } from './core.js';
import { BubbleShooterUI } from './ui.js';


document.addEventListener('DOMContentLoaded', function() {
  const gameDiv = document.getElementById('game');
  const bubbleAreaDiv = document.getElementById('game-bubble-area');
  const shooterDiv = document.getElementById('game-shooter');
  const newGameButton = document.getElementById('new-game-button');

  bubbleAreaDiv.style.width = WIDTH + 'px';
  bubbleAreaDiv.style.height = HEIGHT + 'px';
  shooterDiv.style.marginTop = HEIGHT + 'px';

  const ui = new BubbleShooterUI(gameDiv, bubbleAreaDiv, shooterDiv);

  bubbleAreaDiv.addEventListener('mousemove', event => {
    const shooterRect = shooterDiv.getBoundingClientRect();
    const shooterCenterX = (shooterRect.left + shooterRect.right)/2;
    const shooterCenterY = (shooterRect.top + shooterRect.bottom)/2;
    const xDiff = event.clientX - shooterCenterX;
    const yDiff = event.clientY - shooterCenterY;
    ui.setShooterAngle(Math.atan2(yDiff, xDiff));
  });
  newGameButton.addEventListener('click', () => ui.newGame());
  gameDiv.addEventListener('click', event => ui.shoot());

  ui.newGame();
});
