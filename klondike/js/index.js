document.addEventListener('DOMContentLoaded', function() {
  "use strict";

  const gameDiv = document.getElementById('game');
  const pickInput = document.getElementById('pick-input');
  const newGameButton = document.getElementById('new-game-button');

  pickInput.addEventListener('input', () => {
    newGameButton.disabled = !pickInput.checkValidity();
  });

  require(['./js/ui.js'], UI => {
    const ui = new UI(gameDiv);
    ui.newGame(+pickInput.value);
    newGameButton.addEventListener('click', () => ui.newGame(+pickInput.value));
  });
});
