import { SpiderCore } from './core.js';
import { GameStatus } from '../../common/js/game.js';
import { CardGameUI, SPACING_SMALL, SPACING_BIG } from '../../common/js/cards.js';


export class SpiderUI extends CardGameUI {
  constructor(gameDiv) {
    super(gameDiv, SpiderCore);

    for (const [ card, div ] of this.cardDivs.entries()) {
      div.addEventListener('click', event => this._onClick(card));
    }
  }

  _onClick(card) {
    if (this.currentGame.status !== GameStatus.PLAYING) {
      return;
    }
    if (this.currentGame.placeIdToCardArray.stock.includes(card)) {
      this.currentGame.stockToTableau();
    }
  }

  getNextCardOffset(card, movedCards, newPlaceId) {
    if (newPlaceId === 'stock') {
      // offset them so that the cards for each stockToTableau call are together
      const numberOfTableau = SpiderCore.getCardPlaces().kindToPlaceIds.tableau.length;
      return (movedCards.indexOf(card) % numberOfTableau === 0) ? [SPACING_SMALL, 0] : [0, 0];
    }
    if (newPlaceId.startsWith('tableau')) {
      return card.visible ? [0, SPACING_BIG] : [0, SPACING_SMALL];
    }
    return [0, 0];
  }
}
