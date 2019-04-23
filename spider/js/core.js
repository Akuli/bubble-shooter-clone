import { CardGameCore, Card, SUITS } from '../../common/js/cards.js';


export class SpiderCore extends CardGameCore {
  static createCards() {
    // there are 2*4*13 cards, and they are all of the same suit
    const result = [];
    for (let i = 1; i <= 13; i++) {
      for (let j = 0; j < 2*4; j++) {
        result.push(new Card(i, SUITS[0]));
      }
    }
    return result;
  }

  static getCardPlaceStrings() {
    return [
      "stock - foundation foundation foundation foundation foundation foundation foundation foundation",
      "tableau tableau tableau tableau tableau tableau tableau tableau tableau tableau",
    ];
  }

  constructor(allCards) {
    super(allCards);

    for (const card of this._allCards) {
      card.visible = false;
    }
  }

  checkWin() {
    const foundationArrays = this.constructor.getCardPlaces().kindToPlaceIds.foundation.map(id => this.placeIdToCardArray[id]);
    return foundationArrays.every(cardArray => (cardArray.length === 13));
  }

  deal() {
    this.moveCards(this._allCards, 'stock', false);
    const numberOfTableau = this.constructor.getCardPlaces().kindToPlaceIds.tableau.length;

    const numberOfCardsNotDealt = 5*10;
    const howManyToDealTotal = this._allCards.length - numberOfCardsNotDealt;
    const atLeastHowManyToDealToEachTableau = Math.floor(howManyToDealTotal / numberOfTableau);
    const howManyTableauWillGetOneExtraCardEach = howManyToDealTotal % numberOfTableau;

    for (let i = 0; i < numberOfTableau; i++) {
      const howManyToDeal = atLeastHowManyToDealToEachTableau + !!(i < howManyTableauWillGetOneExtraCardEach);
      const cardsToMove = this.placeIdToCardArray.stock.splice(-howManyToDeal);
      this.moveCards(cardsToMove, 'tableau' + i);
      cardsToMove[cardsToMove.length - 1].visible = true;
    }
  }

  canMaybeMoveSomewhere(card, sourcePlaceId) {
    if (!( sourcePlaceId.startsWith('tableau') && card.visible )) {
      return false;
    }

    const cardArray = this.placeIdToCardArray[sourcePlaceId];
    const index = cardArray.indexOf(card);
    if (index < 0) {
      throw new Error("card and sourcePlaceId don't match");
    }
    const cardsToMove = cardArray.slice(index);

    // the numbers of the cards must be decreasing with decrement 1, e.g. 11 10 9 8 7 ...
    // note that the loop starts at i=1 to avoid doing cardsToMove[-1]
    for (let i = 1; i < cardsToMove.length; i++) {
      if (cardsToMove[i].number !== cardsToMove[i-1].number - 1) {
        return false;
      }
    }
    return true;
  }

  _cardInSomeTableau(card) {
    const tableauArrays = this.constructor.getCardPlaces().kindToPlaceIds.tableau.map(id => this.placeIdToCardArray[id]);
    return tableauArrays.some(subArray => subArray.includes(card));
  }

  canMove(card, sourcePlaceId, destPlaceId) {
    const destArray = this.placeIdToCardArray[destPlaceId];
    if (destArray.length === 0) {
      return true;
    }
    return (card.number === destArray[destArray.length - 1].number - 1);
  }

  rawMove(card, sourcePlaceId, destPlaceId) {
    super.rawMove(card, sourcePlaceId, destPlaceId);

    const sourceArray = this.placeIdToCardArray[sourcePlaceId];
    if (sourcePlaceId.startsWith('tableau') && sourceArray.length !== 0) {
      sourceArray[sourceArray.length - 1].visible = true;
    }

    const destArray = this.placeIdToCardArray[destPlaceId];
    window.asdf = this;
    if (destPlaceId.startsWith('tableau') && destArray.length >= 13) {
      // if a tableau has visible cards K,Q,J,10,9,...,A at top then foundation it
      for (let i = 1; i <= 13; i++) {
        if (destArray[destArray.length - i].number !== i || !destArray[destArray.length - i].visible) {
          return;
        }
      }

      // find a free foundation and move there
      for (const foundationId of this.constructor.getCardPlaces().kindToPlaceIds.foundation.slice().reverse()) {
        if (this.placeIdToCardArray[foundationId].length === 0) {
          this.rawMove(destArray[destArray.length - 13], destPlaceId, foundationId);
          return;
        }
      }
      throw new Error("wtf not enough foundations");
    }
  }

  stockToTableau() {
    const tableauIdArray = this.constructor.getCardPlaces().kindToPlaceIds.tableau;
    if (this.placeIdToCardArray.stock.length % tableauIdArray.length !== 0) {
      throw new Error("calculations are wrong");
    }
    if (this.placeIdToCardArray.stock.length === 0) {
      return;
    }

    for (const tableauId of tableauIdArray) {
      const card = this.placeIdToCardArray.stock[this.placeIdToCardArray.stock.length - 1];
      this.rawMove(card, 'stock', tableauId);
      card.visible = true;
    }
  }
}
