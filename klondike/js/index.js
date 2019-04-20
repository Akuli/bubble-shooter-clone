document.addEventListener('DOMContentLoaded', function() {
  "use strict";

  const gameDiv = document.getElementById('game');
  const newGameButton = document.getElementById('new-game-button');

  require(['./js/ui.js'], UI => {
    const ui = new UI(gameDiv);
    ui.newGame();
    newGameButton.addEventListener('click', () => ui.newGame());
  });
});
