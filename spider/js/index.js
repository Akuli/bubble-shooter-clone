import { SpiderUI } from './ui.js';


document.addEventListener('DOMContentLoaded', function() {
  const gameDiv = document.getElementById('game');
  const newGameButton = document.getElementById('new-game-button');

  const ui = new SpiderUI(gameDiv);
  ui.newGame();
  newGameButton.addEventListener('click', () => ui.newGame());
});
