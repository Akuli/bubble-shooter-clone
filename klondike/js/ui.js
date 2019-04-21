define(['./core.js', '../../js/common.js'], function(core, common) {
  "use strict";

  const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

  const CARD_WIDTH = 70;
  const CARD_HEIGHT = CARD_WIDTH * GOLDEN_RATIO;
  const Y_SPACING_SMALL = 0.1*CARD_HEIGHT;
  const Y_SPACING_BIG = 0.3*CARD_HEIGHT;
  const X_SPACING = 0.3*CARD_WIDTH;

  // cardDiv.left and cardDiv.right are actually coordinates of its center :D
  class UI extends common.UI {
    constructor(gameDiv) {
      super(gameDiv);

      const cards = core.createCards();
      this._cardToDiv = new Map();

      for (const card of cards) {
        const div = document.createElement('div');
        div.classList.add('card');
        div.classList.add(card.suit.color);   // 'red' or 'black'
        div.style.width = CARD_WIDTH + 'px';
        div.style.height = CARD_HEIGHT + 'px';
        div.style.left = (100/7)/2 + '%';
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

        this._cardToDiv.set(card, div);
        gameDiv.appendChild(div);

        card.addEventListener('VisibleChanged', event => this._onCardVisibleChanged(event));
        div.addEventListener('mousedown', event => {
          if (event.which === 1) {
            this._beginDrag(card, event);
          }
        });

        div.addEventListener('auxclick', event => {
          this._onAuxClick(card);
          event.stopPropagation();  // don't do the non-card auxclick handling
        });
      }

      gameDiv.addEventListener('click', event => {
        if (event.which === 2) {
          // clicked with mouse wheel, do same stuff as on double click
          this._onAuxClick(null);
        } else {
          this._onClick(event);
        }
      });
      gameDiv.addEventListener('mousemove', event => this._doDrag(event));
      gameDiv.addEventListener('auxclick', () => this._onAuxClick(null));

      // this should do the right thing if the cards are dragged out of the
      // game area or out of the whole browser
      gameDiv.addEventListener('mouseleave', () => this._endDrag());
      gameDiv.addEventListener('mouseup', () => this._endDrag());

      this._draggingState = null;
    }

    _onCardVisibleChanged(event) {
      if (event.card.visible) {
        this._cardToDiv.get(event.card).classList.add('visible');
      } else {
        this._cardToDiv.get(event.card).classList.remove('visible');
      }
    }

    // may return null
    _cardPlaceFromRelativeCoordinates(x, y) {
      const totalWidth = this.gameDiv.getBoundingClientRect().width;
      const xRatio = x / totalWidth;
      let xCount = Math.floor(xRatio * 7);
      if (xCount < 0) {
        xCount = 0;
      }
      if (xCount >= 7) {
        xCount = 7-1;
      }

      // this is the relative y coordinate between the top row of cards and bottom row
      const yBoundaryPoint = Y_SPACING_SMALL + CARD_HEIGHT + Y_SPACING_SMALL/2;
      if (y > yBoundaryPoint) {
        return new core.CardPlace('tableau', xCount);
      }
      if (xCount === 0) {
        return new core.CardPlace('stock');
      }
      if (xCount === 1) {
        return new core.CardPlace('discard');
      }
      if (xCount === 2) {
        return null;
      }
      return new core.CardPlace('foundation', xCount - 3);
    }

    _beginDrag(card, event) {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      if (this._draggingState !== null) {
        throw new Error("drag begins while dragging already");
      }

      const oldCardPlace = this.currentGame.findCurrentPlace(card);
      if (!this.currentGame.canMaybeMoveSomewhere(card, oldCardPlace)) {
        return;
      }

      const allCardsAtThePlace = this.currentGame.arrayFromCardPlace(oldCardPlace);
      const index = allCardsAtThePlace.indexOf(card);
      if (index < 0) {
        throw new Error("arrayFromCardPlace or findCurrentPlace doesn't work");
      }
      const movingCards = allCardsAtThePlace.slice(index);
      if (movingCards.length === 0) {
        throw new Error("the impossible happened");
      }

      const cardInfos = movingCards.map((card, index) => {
        const div = this._cardToDiv.get(card);
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
        oldCardPlace: oldCardPlace,
        dropPlace: null,
        cardInfos: cardInfos,
      };
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

      const newCardPlace = this._cardPlaceFromRelativeCoordinates(firstXRelative, firstYRelative);
      if (newCardPlace !== null &&
          this.currentGame.canMove(this._draggingState.cardInfos[0].card, this._draggingState.oldCardPlace, newCardPlace)) {
        for (const cardInfo of this._draggingState.cardInfos) {
          cardInfo.div.classList.add('ready2drop');
        }
        this._draggingState.dropPlace = newCardPlace;
      } else {
        for (const cardInfo of this._draggingState.cardInfos) {
          cardInfo.div.classList.remove('ready2drop');
        }
        this._draggingState.dropPlace = null;
      }
    }

    _endDrag() {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      if (this._draggingState === null) {
        return;
      }

      if (this._draggingState.dropPlace === null) {
        for (const cardInfo of this._draggingState.cardInfos) {
          Object.assign(cardInfo.div.style, cardInfo.oldStyle);
        }
      } else {
        this.currentGame.move(this._draggingState.cardInfos[0].card, this._draggingState.oldCardPlace, this._draggingState.dropPlace);
        // _onCardsMoved() handles the rest
      }

      for (const cardInfo of this._draggingState.cardInfos) {
        cardInfo.div.classList.remove('ready2drop');
        cardInfo.div.classList.remove('dragging');
      }
      this._draggingState = null;
    }

    _onClick(event) {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      const gameDivRect = this.gameDiv.getBoundingClientRect();
      const xRelative = event.clientX - gameDivRect.left;
      const yRelative = event.clientY - gameDivRect.top;
      const clickedCardPlace = this._cardPlaceFromRelativeCoordinates(xRelative, yRelative);
      if (clickedCardPlace !== null && clickedCardPlace.kind === 'stock') {
        this.currentGame.stockToDiscard();
      }
    }

    _onAuxClick(card) {
      if (this.currentGame.status !== common.GameStatus.PLAYING) {
        return;
      }

      if (card === null) {
        while( this.currentGame.moveAnyCardToAnyFoundationIfPossible() ){}
      } else {
        this.currentGame.moveCardToAnyFoundationIfPossible(card, this.currentGame.findCurrentPlace(card));
      }
    }

    _onCardsMoved(event) {
      let xCount, yCenter;
      if (event.newPlace.kind === 'tableau') {
        xCount = event.newPlace.number;
        yCenter = Y_SPACING_SMALL + CARD_HEIGHT + Y_SPACING_SMALL + CARD_HEIGHT/2;
      } else {
        yCenter = Y_SPACING_SMALL + CARD_HEIGHT/2;
        if (event.newPlace.kind === 'foundation') {
          xCount = event.newPlace.number + 3;
        } else if (event.newPlace.kind === 'stock') {
          xCount = 0;
        } else if (event.newPlace.kind === 'discard') {
          xCount = 1;
        } else {
          throw new Error("unknown card place kind: " + event.newPlace.kind);
        }
      }

      let xExtraOffset = 0;
      const xCenterPercentsPart = (xCount + 1/2) / 7 * 100;
      let zIndex = 1;
      for (const card of this.currentGame.arrayFromCardPlace(event.newPlace)) {
        const div = this._cardToDiv.get(card);
        div.style.left = `calc(${xCenterPercentsPart}% + ${xExtraOffset}px)`;
        div.style.top = yCenter + 'px';
        div.style.zIndex = zIndex++;
        if (event.newPlace.kind === 'tableau') {
          yCenter += card.visible ? Y_SPACING_BIG : Y_SPACING_SMALL;
        }
        window.asdf = event.cards;
        if (event.newPlace.kind === 'discard' && event.cards.includes(card)) {
          xExtraOffset += X_SPACING;
        }
      }

      // i think this is not possible with just css
      // this assumes that all y coordinates are in pixels, which would be wrong for x coordinates
      const maxCardCenterY = Math.max(...( Array.from(this._cardToDiv.values()).map(div => +div.style.top.split('px')[0]) ));
      this.gameDiv.style.height = (maxCardCenterY + CARD_HEIGHT/2 + Y_SPACING_SMALL) + 'px';
    }

    newGame(pickCount) {
      this.currentGame = new core.Game(Array.from(this._cardToDiv.keys()), pickCount);
      this.currentGame.addEventListener('CardsMoved', (event => this._onCardsMoved(event)));
      this.currentGame.deal();
      super.newGame();
    }
  }

  return UI;
});
