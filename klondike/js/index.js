import { KlondikeUI } from './ui.js';


document.addEventListener('DOMContentLoaded', function() {
  const gameDiv = document.getElementById('game');
  const pickInput = document.getElementById('pick-input');
  const newGameButton = document.getElementById('new-game-button');

  pickInput.addEventListener('input', () => {
    newGameButton.disabled = !pickInput.checkValidity();
  });

  const ui = new KlondikeUI(gameDiv);
  ui.newGame(+pickInput.value);
  newGameButton.addEventListener('click', () => ui.newGame(+pickInput.value));
});
