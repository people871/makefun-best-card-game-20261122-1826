// EMBER COURT — tuning numbers, all in one place so the game can be balanced
// without touching the rules in world.js or the painter in render.js.
export const CANVAS = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const BEST_KEY = 'ember-court-best-score';
export const START_LIFE = 30;
export const START_MANA = 3;
export const MAX_MANA = 10;
export const HAND_SIZE_START = 5;
export const HAND_MAX = 7;
export const DRAW_PER_TURN = 2;
export const LANES = 3;
export const MAX_TURNS = 12;
export const DECK_SIZE = 52;

// Rank 2..14 (11=J, 12=Q, 13=K, 14=A). Cost grows with rank in bands of three.
export function cardCost(rank) {
  return 1 + Math.floor((rank - 2) / 3);
}
// Attack is the rank itself, so an Ace hits for 14 and a Two for 2.
export function cardAttack(rank) {
  return rank;
}
export const SUITS = [
  { id: 'spades', symbol: '♠', name: 'Spades', color: '#1c2733', bonus: '+2 lane power', text: 'Spades strike hard: +2 power in its lane.' },
  { id: 'hearts', symbol: '♥', name: 'Hearts', color: '#c2253f', bonus: 'Heal 2 life', text: 'Hearts mend you: restore 2 life when played.' },
  { id: 'diamonds', symbol: '♦', name: 'Diamonds', color: '#b3541e', bonus: 'Draw 1 card', text: 'Diamonds are sharp: draw 1 card when played.' },
  { id: 'clubs', symbol: '♣', name: 'Clubs', color: '#1e6b3a', bonus: '+1 mana', text: 'Clubs feed your mana: gain 1 mana when played.' },
];
export const RANK_LABELS = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export function rankLabel(rank) {
  return RANK_LABELS[rank] ?? String(rank);
}
// Same suit already in the lane: synergy. Same rank already in the lane: a pair.
export const SYNERGY_SAME_SUIT = 3;
export const SYNERGY_SAME_RANK = 4;
export const HEAL_ON_HEARTS = 2;
export const MANA_ON_CLUBS = 1;
export const SCORE_PER_DAMAGE = 10;
export const SCORE_PER_CARD = 5;
export const SCORE_PER_WIN = 500;
export const TIME_BONUS_PER_TURN_LEFT = 25;
