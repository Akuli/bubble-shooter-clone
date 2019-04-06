document.addEventListener('DOMContentLoaded', function() {
  "use strict";

  const widthInput = document.getElementById('width-input');
  const heightInput = document.getElementById('height-input');
  const mineCountInput = document.getElementById('mine-count-input');
  const minePercentageInput = document.getElementById('mine-percentage-input');

  const newGameButton = document.getElementById('new-game-button');
  const gameDiv = document.getElementById('game');
  const statusMessagePara = document.getElementById('game-status-message');

  function validateEverything(minePercentageToCount) {
    if (!widthInput.checkValidity() || !heightInput.checkValidity()) {
      return;
    }

    const width = +widthInput.value;
    const height = +heightInput.value;

    // mine count must NOT be exactly width*height, because that way beginning the minesweeper
    // game without exploding would be impossible, even though that should happen every time
    mineCountInput.max = width*height - 1;

    if (minePercentageToCount) {
      if (!minePercentageInput.checkValidity()) {
        return;
      }

      const requestedPercentage = +minePercentageInput.value.slice(0, -1);

      // this might not be valid because rounding can produce 0 or width*height, but that's handled below
      mineCountInput.value = Math.round(requestedPercentage / 100 * (width*height));
    }

    if (!mineCountInput.checkValidity()) {
      return;
    }

    const percentage = (+mineCountInput.value) / (width*height) * 100;
    minePercentageInput.value = percentage.toFixed(3) + '%';
    if (!minePercentageInput.checkValidity()) {
      throw new Error(`something resulted in an invalid percentage: ${minePercentageInput.value}`);
    }

    newGameButton.disabled = false;
  }

  // minePercentageInput is special because validateEverything(true) would change its value
  widthInput.addEventListener('input', () => validateEverything(true));
  heightInput.addEventListener('input', () => validateEverything(true));
  mineCountInput.addEventListener('input', () => validateEverything(false));
  minePercentageInput.addEventListener('change', () => validateEverything(true));
  validateEverything(false);   // default count is set in the html, percentage isn't

  const allInputs = [ widthInput, heightInput, mineCountInput, minePercentageInput ];
  for (const input of allInputs) {
    input.addEventListener('input', () => {
      newGameButton.disabled = !allInputs.every(input => input.validity.valid);
    });
  }

  require(['./js/ui.js'], function(UI) {
    const ui = new UI(gameDiv, statusMessagePara);

    function startNewGame() {
      const width = +widthInput.value;
      const height = +heightInput.value;
      const nMines = +mineCountInput.value;
      ui.newGame(width, height, nMines);
    }

    newGameButton.addEventListener('click', startNewGame);
    startNewGame();
  });
});
