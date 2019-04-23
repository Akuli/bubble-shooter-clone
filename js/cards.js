// things for card games
define(['./common.js'], function(common) {
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

  class CardGameCore extends common.Core {
    static getCardPlaceStrings() {
      throw new Error("wasn't overrided");
    }

    static getCardPlaces() {
      // superstitious optimization
      if (this._cachedCardPlaces !== undefined) {
        return this._cachedCardPlaces;
      }

      const kindToCounts = {};
      const stringArray = this.getCardPlaceStrings();
      const width = stringArray[0].split(' ').length;

      for (const [ yCount, string ] of stringArray.entries()) {
        // numbers are used for funny hacks later, e.g. 'foundation0' means the first foundation
        if (/\d/.test(string)) {
          throw new Error("card place string contains a number: " + string);
        }

        const stringParts = string.split(' ');
        if (stringParts.length !== width) {
          throw new Error("inconsistent string part count");
        }

        for (const [ xCount, kind ] of stringParts.entries()) {
          if (kind === '-') {
            continue;
          }
          if (kindToCounts[kind] === undefined) {
            kindToCounts[kind] = [];
          }
          kindToCounts[kind].push([ xCount, yCount ]);
        }
      }

      const result = {
        kindToPlaceIds: {},  // e.g. { 'foundation': ['foundation0', 'foundation1', 'foundation2', 'foundation3'] }
        placeIdToCounts: {}, // e.g. { 'foundation0': [3, 0] }
        countsToPlaceId: {}, // e.g. { '3,0': 'foundation0' }
        countsToKind: {},    // e.g. { '3,0': 'foundation' }
        width: width,
        height: stringArray.length,
      };
      for (const [ kind, counts2dArray ] of Object.entries(kindToCounts)) {
        result.kindToPlaceIds[kind] = [];
        for (const [ index, counts ] of counts2dArray.entries()) {
          let id = kind;
          if (counts2dArray.length !== 1) {
            id += index;
          }
          result.kindToPlaceIds[kind].push(id);
          result.placeIdToCounts[id] = counts;
          result.countsToPlaceId[counts] = id;
          result.countsToKind[counts] = kind;
        }
      }

      this._cachedCardPlaces = result;
      return result;
    }

    static createCards() {
      const result = [];
      for (const suit of SUITS) {
        for (let number = 1; number <= 13; number++) {
          result.push(new Card(number, suit));
        }
      }
      return result;
    }

    constructor(allCards) {
      super();
      this._allCards = Array.from(allCards);   // would be confusing to modify argument in-place
      shuffle(this._allCards);

      this.placeIdToCardArray = {};     // TODO: rename to .cardArrays or something else less annoyingly verbose
      for (const id of Object.keys(this.constructor.getCardPlaces().placeIdToCounts)) {
        this.placeIdToCardArray[id] = [];
      }
    }

    // is called after constructing a new instance and connecting card move events
    deal() {
      throw new Error("wasn't overrided");
    }

    // should return true for win, false for keep playing
    checkWin() {
      throw new Error("wasn't overrided");
    }

    moveCards(cardArray, newPlaceId, setStatus) {
      if (setStatus === undefined) {
        setStatus = true;
      }

      this.placeIdToCardArray[newPlaceId].push(...cardArray);

      const event = new Event('CardsMoved');
      event.newPlaceId = newPlaceId;
      event.cardArray = cardArray;
      this.dispatchEvent(event);

      if (setStatus && this.checkWin()) {
        this.status = common.GameStatus.WIN;
      }
    }

    // this might be kind of slow, avoid e.g. calling in a loop
    findCurrentPlaceId(card) {
      for (const [ id, cardArray ] of Object.entries(this.placeIdToCardArray)) {
        if (cardArray.includes(card)) {
          return id;
        }
      }
      throw new Error("cannot find card");
    }

    // is called to check whether dragging the card is allowed
    canMaybeMoveSomewhere(card, sourcePlaceId) {
      throw new Error("wasn't overrided");
    }

    // is called to figure out whether a card can be dropped to the place
    // should return false when sourcePlaceId === destPlaceId
    canMove(card, sourcePlaceId, destPlaceId) {
      throw new Error("wasn't overrided");
    }

    rawMove(card, sourcePlaceId, destPlaceId) {
      const sourceArray = this.placeIdToCardArray[sourcePlaceId];

      const index = sourceArray.indexOf(card);
      if (index === -1) {
        throw new Error("card and sourcePlaceId don't match");
      }
      const moving = sourceArray.splice(index);
      this.moveCards(moving, destPlaceId);
    }

    move(card, sourcePlaceId, destPlaceId) {
      if (!this.canMove(card, sourcePlaceId, destPlaceId)) {
        throw new Error("invalid move");
      }
      this.rawMove(card, sourcePlaceId, destPlaceId);
    }
  }

  const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

  const CARD_WIDTH = 70;
  const CARD_HEIGHT = CARD_WIDTH * GOLDEN_RATIO;
  const Y_SPACING_SMALL = 0.1*CARD_HEIGHT;
  const Y_SPACING_BIG = 0.3*CARD_HEIGHT;
  const X_SPACING = 0.3*CARD_WIDTH;

  function putNumberBetween(num, min, maxPlus1) {
    if (num < min) {
      return min;
    }
    if (num >= maxPlus1) {
      return maxPlus1 - 1;
    }
    return num;
  }

  class CardGameUI extends common.UI {
    // when reading this class, keep in mind that cardDiv.left and cardDiv.top are actually coordinates of center :D
    // this is because the css does translate(-50%, -50%)

    constructor(gameDiv, CoreClass) {
      super(gameDiv);
      this._CoreClass = CoreClass;

      const xIncrementPercents = 100 / CoreClass.getCardPlaces().width;

      this.cardPlaceDivs = {};
      for (const [ id, [xCount, yCount] ] of Object.entries(CoreClass.getCardPlaces().placeIdToCounts)) {
        const div = document.createElement('div');
        div.classList.add('card-place');
        div.style.width = CARD_WIDTH + 'px';
        div.style.height = CARD_HEIGHT + 'px';
        div.style.left = (xCount + 1/2)*xIncrementPercents + '%';
        div.style.top = ( yCount*(Y_SPACING_SMALL + CARD_HEIGHT) + Y_SPACING_SMALL + CARD_HEIGHT/2 )+'px';
        gameDiv.appendChild(div);
        this.cardPlaceDivs[id] = div;
      }

      const cardArray = CoreClass.createCards();
      this.cardDivs = new Map();

      for (const card of cardArray) {
        const div = document.createElement('div');
        div.classList.add('card');
        div.classList.add(card.suit.color);   // 'red' or 'black'
        div.style.width = CARD_WIDTH + 'px';
        div.style.height = CARD_HEIGHT + 'px';
        div.style.left = xIncrementPercents/2 + '%';
        div.style.top = (Y_SPACING_SMALL + CARD_HEIGHT/2) + 'px';

        if (navigator.userAgent.toLowerCase().indexOf('firefox') !== -1) {
          // https://stackoverflow.com/q/29784166
          // the css file says translate(-50%, -50%) which works in other browsers
          // the bug doesn't happen if the translate amount is an integer
          div.style.transform = `translate(-${Math.round(CARD_WIDTH/2)}px, -${Math.round(CARD_HEIGHT/2)}px)`;
        }

        for (const loop of [1, 2]) {   // loop 2 times, to create top left and bottom right corner stuff
          const subDiv = document.createElement('div');
          div.appendChild(subDiv);

          const numberSpan = document.createElement('span');
          numberSpan.classList.add('number');
          numberSpan.textContent = card.getNumberString();
          subDiv.appendChild(numberSpan);

          const suitSpan = document.createElement('span');
          suitSpan.classList.add('suit');
          suitSpan.textContent = card.suit.unicode;
          subDiv.appendChild(suitSpan);
        }

        this.cardDivs.set(card, div);
        gameDiv.appendChild(div);

        card.addEventListener('VisibleChanged', event => this._onCardVisibleChanged(event));
        div.addEventListener('mousedown', event => {
          if (event.which === 1) {
            this._beginDrag(card, event);
          }
        });
      }

      gameDiv.addEventListener('mousemove', event => this._doDrag(event));

      // this should do the right thing if the cards are dragged out of the
      // game area or out of the whole browser
      gameDiv.addEventListener('mouseleave', () => this._endDrag());
      gameDiv.addEventListener('mouseup', () => this._endDrag());

      this._draggingState = null;
    }

    newGame() {
      this.currentGame = new this._CoreClass(Array.from(this.cardDivs.keys()), ...arguments);
      this.currentGame.addEventListener('CardsMoved', (event => this._onCardsMoved(event)));
      this.currentGame.deal();
      super.newGame();
    }

    _onCardVisibleChanged(event) {
      if (event.card.visible) {
        this.cardDivs.get(event.card).classList.add('visible');
      } else {
        this.cardDivs.get(event.card).classList.remove('visible');
      }
    }

    _beginDrag(card, event) {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      if (this._draggingState !== null) {
        throw new Error("drag begins while dragging already");
      }

      const oldCardPlaceId = this.currentGame.findCurrentPlaceId(card);
      if (!this.currentGame.canMaybeMoveSomewhere(card, oldCardPlaceId)) {
        return;
      }

      const allCardsAtThePlace = this.currentGame.placeIdToCardArray[oldCardPlaceId];
      const index = allCardsAtThePlace.indexOf(card);
      if (index < 0) {
        throw new Error("placeIdToCardArray or findCurrentPlaceId doesn't work");
      }
      const movingCards = allCardsAtThePlace.slice(index);
      if (movingCards.length === 0) {
        throw new Error("the impossible happened");
      }

      const cardInfos = movingCards.map((card, index) => {
        const div = this.cardDivs.get(card);
        const divRect = div.getBoundingClientRect();

        const oldStyle = {
          left: div.style.left,
          top: div.style.top,
          zIndex: div.style.zIndex,
        };
        div.style.zIndex = 100 + index;
        div.classList.add('dragging');

        return {
          card: card,
          div: div,
          oldStyle: oldStyle,
          mouseOffsetFromCenterX: event.clientX - (divRect.left + divRect.right)/2,
          mouseOffsetFromCenterY: event.clientY - (divRect.top + divRect.bottom)/2,
        };
      });

      this._draggingState = {
        oldCardPlaceId: oldCardPlaceId,
        dropPlaceId: null,
        cardInfos: cardInfos,
      };
    }

    // may return null
    _cardPlaceIdFromRelativeCoordinates(x, y) {
      const totalWidth = this.gameDiv.getBoundingClientRect().width;
      const xRatio = x / totalWidth;
      const xCountRaw = Math.floor(xRatio * this._CoreClass.getCardPlaces().width);

      const yCenterOfYCountZero = Y_SPACING_SMALL + CARD_HEIGHT/2;
      const yDifferenceBetweenTwoRows = Y_SPACING_SMALL + CARD_HEIGHT;
      const yDifference = y - yCenterOfYCountZero;
      const yCountRaw = Math.round(yDifference / yDifferenceBetweenTwoRows);

      // this makes the game much more intuitive when card piles get tall (e.g. tableau in solitaire)
      const xCount = putNumberBetween(xCountRaw, 0, this._CoreClass.getCardPlaces().width);
      const yCount = putNumberBetween(yCountRaw, 0, this._CoreClass.getCardPlaces().height);

      const placeId = this._CoreClass.getCardPlaces().countsToPlaceId[xCount + ',' + yCount];
      if (placeId === undefined) {
        return null;
      }
      return placeId;
    }

    _doDrag(event) {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      if (this._draggingState === null) {
        return;
      }

      const gameDivRect = this.gameDiv.getBoundingClientRect();
      let firstXRelative = null;
      let firstYRelative = null;

      for (const cardInfo of this._draggingState.cardInfos) {
        const xRelative = event.clientX - gameDivRect.left - cardInfo.mouseOffsetFromCenterX;
        const yRelative = event.clientY - gameDivRect.top - cardInfo.mouseOffsetFromCenterY;
        cardInfo.div.style.left = xRelative + 'px';
        cardInfo.div.style.top = yRelative + 'px';

        if (firstXRelative === null && firstYRelative === null) {
          firstXRelative = xRelative;
          firstYRelative = yRelative;
        }
      }

      const newCardPlaceId = this._cardPlaceIdFromRelativeCoordinates(firstXRelative, firstYRelative);
      if (newCardPlaceId !== null &&
          this.currentGame.canMove(this._draggingState.cardInfos[0].card, this._draggingState.oldCardPlaceId, newCardPlaceId)) {
        for (const cardInfo of this._draggingState.cardInfos) {
          cardInfo.div.classList.add('ready2drop');
        }
        this._draggingState.dropPlaceId = newCardPlaceId;
      } else {
        for (const cardInfo of this._draggingState.cardInfos) {
          cardInfo.div.classList.remove('ready2drop');
        }
        this._draggingState.dropPlaceId = null;
      }
    }

    _endDrag() {
      if (this.currentGame.status !== common.GameStatus.PLAYING || this._draggingState === null) {
        return;
      }

      if (this._draggingState.dropPlaceId === null) {
        for (const cardInfo of this._draggingState.cardInfos) {
          Object.assign(cardInfo.div.style, cardInfo.oldStyle);
        }
      } else {
        this.currentGame.move(this._draggingState.cardInfos[0].card, this._draggingState.oldCardPlaceId, this._draggingState.dropPlaceId);
        // _onCardsMoved() handles the rest
      }

      for (const cardInfo of this._draggingState.cardInfos) {
        cardInfo.div.classList.remove('ready2drop');
        cardInfo.div.classList.remove('dragging');
      }
      this._draggingState = null;
    }

    // this is ran for each card when cards have been moved
    // override to customize where the cards go
    getNextCardOffset(card, cardWasMoved, newPlaceId) {
      return [0, 0];
    }

    _onCardsMoved(event) {
      const [ xCount, yCount ] = this._CoreClass.getCardPlaces().placeIdToCounts[event.newPlaceId];
      const xIncrementPercents = 100 / this._CoreClass.getCardPlaces().width;
      const xCenterPercents = (xCount + 1/2) * xIncrementPercents;
      const yCenter = Y_SPACING_SMALL + CARD_HEIGHT/2 + (Y_SPACING_SMALL + CARD_HEIGHT)*yCount;

      let zIndex = 1;
      let xOffset = 0;
      let yOffset = 0;

      for (const card of this.currentGame.placeIdToCardArray[event.newPlaceId]) {
        const div = this.cardDivs.get(card);
        div.style.left = `calc(${xCenterPercents}% + ${xOffset}px)`;
        div.style.top = (yCenter + yOffset) + 'px';
        div.style.zIndex = zIndex++;

        const [ xOffsetMore, yOffsetMore ] = this.getNextCardOffset(card, event.cardArray, event.newPlaceId);
        xOffset += xOffsetMore;
        yOffset += yOffsetMore;
      }

      // i think this is not possible with just css
      // this assumes that all y coordinates are in pixels, which would be wrong for x coordinates
      const maxCardCenterY = Math.max(...( Array.from(this.cardDivs.values()).map(div => +div.style.top.split('px')[0]) ));
      this.gameDiv.style.height = (maxCardCenterY + CARD_HEIGHT/2 + Y_SPACING_SMALL) + 'px';
    }
  }

  return {
    SUITS: SUITS,
    Card: Card,
    CardGameCore: CardGameCore,
    CardGameUI: CardGameUI,
    X_SPACING: X_SPACING,
    Y_SPACING_SMALL: Y_SPACING_SMALL,
    Y_SPACING_BIG: Y_SPACING_BIG,
  };
});