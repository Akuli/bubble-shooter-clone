define(['../../js/common.js'], function(common) {
  "use strict";

  const SUITS = [
    { name: 'spade', color: 'black', unicode: '\u2660' },
    { name: 'club', color: 'black', unicode: '\u2663' },
    { name: 'heart', color: 'red', unicode: '\u2665' },
    { name: 'diamond', color: 'red', unicode: '\u2666' },
  ];

  class Card extends EventTarget {
    constructor(number, suit) {
      super();
      this.number = number;
      this.suit = suit;
      this._visible = false;
    }

    // this identifies the cards well
    getIdString() {
      return this.suit.name + this.number;
    }

    getNumberString() {
      switch (this.number) {
        case 1: return 'A';
        case 11: return 'J';
        case 12: return 'Q';
        case 13: return 'K';
        default: return (this.number + '');
      }
    }

    get visible() {
      return this._visible;
    }

    set visible(boolValue) {
      this._visible = boolValue;
      const event = new Event('VisibleChanged');
      event.card = this;
      this.dispatchEvent(event);
    }
  }

  // https://stackoverflow.com/a/6274381
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  class CardPlace {
    constructor(kind, optionalNumber) {
      this.kind = kind;

      if (kind === 'stock' || kind == 'discard') {
        if (optionalNumber !== undefined) {
          throw new Error(`should be cardPlace('${kind}'), not cardPlace('${kind}', something)`);
        }
        this.number = null;
      } else if (kind === 'foundation' || kind === 'tableau') {
        const numberLimit = { foundation: 4, tableau: 7 }[kind];
        if (typeof(optionalNumber) !== 'number' || optionalNumber < 0 || optionalNumber >= numberLimit) {
          throw new Error(`expected an integer between 0 and ${numberLimit-1}, got ${optionalNumber}`);
        }
        this.number = optionalNumber;
      } else {
        throw new Error(`unknown card place kind: ${kind}`);
      }
    }
  }

  function createCards() {
    const result = [];
    for (const suit of SUITS) {
      for (let number = 1; number <= 13; number++) {
        result.push(new Card(number, suit));
      }
    }
    return result;
  }

  class Game extends common.Core {
    constructor(cards) {
      if (cards.length !== 13*4) {
        throw new Error(`expected ${13*4} cards, got ${cards.length} cards`);
      }
      super();

      this._allCards = Array.from(cards);   // would be confusing to modify argument in-place
      shuffle(this._allCards);

      this._tableau = [ [], [], [], [], [], [], [] ];
      this._foundations = [ [], [], [], [] ];
      this._discard = [];
      this._stock = [];

      for (const card of this._allCards) {
        card.visible = false;
      }
    }

    arrayFromCardPlace(place) {
      switch (place.kind) {
        case 'foundation': return this._foundations[place.number];
        case 'tableau': return this._tableau[place.number];
        case 'stock': return this._stock;
        case 'discard': return this._discard;
        default: throw new Error(`unknown card place kind: ${place.kind}`);
      }
    }

    _moveCards(cardArray, newPlace, setStatus) {
      if (setStatus === undefined) {
        setStatus = true;
      }

      this.arrayFromCardPlace(newPlace).push(...cardArray);

      const event = new Event('CardsMoved');
      event.newPlace = newPlace;
      event.cards = cardArray;
      this.dispatchEvent(event);

      if ( setStatus && this._foundations.every(cardList => (cardList.length === 13)) ) {
        this.status = common.GameStatus.WIN;
      }
    }

    // must be called after constructing a Game
    deal() {
      this._moveCards(this._allCards, new CardPlace('stock'), false);
      for (let i = 0; i < 7; i++) {
        const howManyCardsToMove = i+1;
        const cardsToMove = this._stock.splice(-howManyCardsToMove);
        this._moveCards(cardsToMove, new CardPlace('tableau', i));
        cardsToMove[cardsToMove.length - 1].visible = true;
      }
    }

    _cardInSomeTableau(card) {
      return this._tableau.some(subArray => subArray.includes(card));
    }

    // this is kind of slow, avoid e.g. calling in a loop
    findCurrentPlace(card) {
      if (this._stock.includes(card)) {
        return new CardPlace('stock');
      }
      if (this._discard.includes(card)) {
        return new CardPlace('discard');
      }
      for (let i = 0; i < this._foundations.length; i++) {
        if (this._foundations[i].includes(card)) {
          return new CardPlace('foundation', i);
        }
      }
      for (let i = 0; i < this._tableau.length; i++) {
        if (this._tableau[i].includes(card)) {
          return new CardPlace('tableau', i);
        }
      }

      throw new Error("cannot find card: " + card.getIdString());
    }

    // should be called to check whether dragging the card is allowed
    canMaybeMoveSomewhere(card, sourcePlace) {
      if (sourcePlace.kind === 'stock') {
        // never makes sense (discarding is handled separately)
        return false;
      }
      if (sourcePlace.kind === 'discard' || sourcePlace.kind === 'foundation') {
        // makes sense only for the topmost card
        const cardArray = this.arrayFromCardPlace(sourcePlace);
        return (card === cardArray[cardArray.length - 1]);
      }
      if (sourcePlace.kind === 'tableau') {
        return card.visible;
      }
      throw new Error("unknown card place kind: " + sourcePlace.kind);
    }

    canMove(card, sourcePlace, destPlace) {
      const sourceArray = this.arrayFromCardPlace(sourcePlace);
      const sourceArrayIndex = sourceArray.indexOf(card);
      if (sourceArrayIndex < 0) {
        throw new Error("card and sourcePlace don't match");
      }
      const isTopmost = (sourceArrayIndex === sourceArray.length - 1);

      if (isTopmost) {
        if (destPlace.kind === 'stock' || destPlace.kind === 'discard' || !card.visible) {
          return false;
        }
        if (destPlace.kind === 'foundation') {
          const destArray = this._foundations[destPlace.number];
          if (destArray.length === 0) {
            return (card.number === 1);
          }
          const topmostCard = destArray[destArray.length - 1];
          return (card.suit === topmostCard.suit && card.number === topmostCard.number + 1);
        }
      } else {
        // the only valid move for a stack of cards is tableau --> tableau
        // for that, the bottommost moving card must be visible
        if (!( this._cardInSomeTableau(card) && destPlace.kind === 'tableau' && card.visible )) {
          return false;
        }
        // the tableau move is checked below like any other tableau move
      }

      if (destPlace.kind !== 'tableau') {
        throw new Error("bug");   // lol
      }
      const destArray = this._tableau[destPlace.number];
      if (destArray.length === 0) {
        return (card.number === 13);
      }
      const topmostCard = destArray[destArray.length - 1];
      return (card.suit.color !== topmostCard.suit.color && card.number === topmostCard.number - 1);
    }

    // removes a card and the cards on top of it from the game, and returns an array of them
    _detachCards(card, sourcePlace) {
      const cardArray = this.arrayFromCardPlace(sourcePlace);
    }

    rawMove(card, sourcePlace, destPlace) {
      const sourceArray = this.arrayFromCardPlace(sourcePlace);
      const index = sourceArray.indexOf(card);
      if (index === -1) {
        throw new Error("card and sourcePlace don't match");
      }
      const moving = sourceArray.splice(index);

      this._moveCards(moving, destPlace);

      if (sourcePlace.kind === 'tableau' && sourceArray.length !== 0) {
        sourceArray[sourceArray.length - 1].visible = true;
      }
    }

    move(card, sourcePlace, destPlace) {
      if (!this.canMove(card, sourcePlace, destPlace)) {
        throw new Error("invalid move");
      }
      this.rawMove(card, sourcePlace, destPlace);
    }

    stockToDiscard() {
      // TODO: pick more than 1 card at a time, if user wants to
      if (this._stock.length === 0) {
        while (this._discard.length !== 0) {
          const card = this._discard.pop();
          card.visible = false;
          this._moveCards([card], new CardPlace('stock'));
        }
      } else {
        const card = this._stock.pop();
        this._moveCards([card], new CardPlace('discard'));
        card.visible = true;
      }
    }

    moveCardToAnyFoundationIfPossible(card, sourcePlace) {
      for (let i = 0; i < 4; i++) {
        const foundationPlace = new CardPlace('foundation', i);
        if (this.canMove(card, sourcePlace, foundationPlace)) {
          this.move(card, sourcePlace, foundationPlace);
          return true;
        }
      }
      return false;
    }

    moveAnyCardToAnyFoundationIfPossible() {
      const arraysAndPlaces = this._tableau.map((cardArray, index) => {
        return { array: cardArray, place: new CardPlace('tableau', index) };
      }).concat([
        { array: this._discard, place: new CardPlace('discard') },
      ]);

      for (const { array, place } of arraysAndPlaces) {
        if ( array.length !== 0 && this.moveCardToAnyFoundationIfPossible(array[array.length - 1], place) ) {
          return true;
        }
      }
      return false;
    }
  }

  return {
    CardPlace: CardPlace,
    Game: Game,
    createCards: createCards,
  };
});
