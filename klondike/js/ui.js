import { KlondikeCore } from './core.js';
import { GameStatus } from '../../common/js/game.js';
import { CardGameUI, X_SPACING, Y_SPACING_BIG, Y_SPACING_SMALL } from '../../common/js/cards.js';


export class KlondikeUI extends CardGameUI {
  constructor(gameDiv) {
    super(gameDiv, KlondikeCore);

    this.cardPlaceDivs.stock.addEventListener('click', () => this._onClick(null));

    for (const [ card, div ] of this.cardDivs.entries()) {
      div.addEventListener('click', event => {
        this._onClick(card);
      });
      div.addEventListener('auxclick', event => {
        this._onAuxClick(card);
        event.stopPropagation();  // don't do the non-card auxclick handling
      });
    }

    gameDiv.addEventListener('auxclick', () => this._onAuxClick(null));
  }

  _onClick(card) {
    if (this.currentGame.status !== GameStatus.PLAYING) {
      return;
    }
    if (card === null || this.currentGame.placeIdToCardArray.stock.includes(card)) {
      this.currentGame.stockToDiscard();
    }
  }

  _onAuxClick(card) {
    if (this.currentGame.status !== GameStatus.PLAYING) {
      return;
    }

    if (card === null) {
      while( this.currentGame.moveAnyCardToAnyFoundationIfPossible() ){}
    } else {
      this.currentGame.moveCardToAnyFoundationIfPossible(card, this.currentGame.findCurrentPlaceId(card));
    }
  }

  getNextCardOffset(card, movedCards, newPlaceId) {
    if (newPlaceId === 'discard' && movedCards.includes(card)) {
      return [X_SPACING, 0];
    }
    if (newPlaceId.startsWith('tableau')) {
      return card.visible ? [0, Y_SPACING_BIG] : [0, Y_SPACING_SMALL];
    }
    return [0, 0];
  }
}
