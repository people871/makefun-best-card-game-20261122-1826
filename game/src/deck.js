// The 52-card deck: one card per rank 2..14 in each of the four suits.
// A card is a plain object { id, suit, rank, cost, attack } — the rules in
// world.js read cost/attack/suit from here and nowhere else.
import { SUITS, cardCost, cardAttack, rankLabel } from './config.js';

export function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      cards.push({
        id: `${suit.id}-${rank}`,
        suit: suit.id,
        symbol: suit.symbol,
        suitName: suit.name,
        suitColor: suit.color,
        rank,
        label: rankLabel(rank),
        cost: cardCost(rank),
        attack: cardAttack(rank),
      });
    }
  }
  return cards;
}
export function cardName(card) {
  return `${card.label}${card.symbol}`;
}
export function describeCard(card) {
  const suit = SUITS.find((s) => s.id === card.suit);
  return `${cardName(card)} — cost ${card.cost}, power ${card.attack}, ${suit.bonus}`;
}
