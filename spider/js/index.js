import { SpiderCore } from './core.js';
import { SpiderUI } from './ui.js';


document.addEventListener('DOMContentLoaded', () => {
  const gameDiv = document.getElementById('game');
  const newGameButton = document.getElementById('new-game-button');
  const difficultyInputs = document.getElementById('difficulty-inputs');

  const ui = new SpiderUI(gameDiv);
  ui.newGame(1);

  newGameButton.addEventListener('click', () => {
    const selectedInput = difficultyInputs.querySelector('input:checked');
    ui.newGame(+selectedInput.value);
  });
});
