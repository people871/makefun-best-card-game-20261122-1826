// EMBER COURT — rules and state, no drawing and no browser in here.
// A 3-lane card battler over a shared 52-card deck. You and the Duchess each
// draw from your own shuffled copy of the deck. Each round you play cards into
// the three lanes (paying mana), the Duchess answers, then every lane resolves:
// the stronger lane deals the difference as damage to the other side's life.
// First side to 0 life loses; after 12 rounds the higher life wins.
import {
  START_LIFE, START_MANA, MAX_MANA, HAND_SIZE_START, HAND_MAX, DRAW_PER_TURN,
  LANES, MAX_TURNS, SYNERGY_SAME_SUIT, SYNERGY_SAME_RANK, HEAL_ON_HEARTS,
  MANA_ON_CLUBS, SCORE_PER_DAMAGE, SCORE_PER_CARD, SCORE_PER_WIN,
  TIME_BONUS_PER_TURN_LEFT,
} from './config.js';
import { buildDeck } from './deck.js';
import { shuffle } from './random.js';

export const PHASE_PLAYER = 'player';
export const PHASE_OVER = 'over';

function makeSide(random) {
  return {
    life: START_LIFE, mana: START_MANA, maxMana: START_MANA,
    deck: shuffle(buildDeck(), random), hand: [], discard: [],
    score: 0, cardsPlayed: 0, damageDealt: 0,
  };
}
function drawCards(side, n) {
  let drawn = 0;
  for (let i = 0; i < n; i += 1) {
    if (side.hand.length >= HAND_MAX || side.deck.length === 0) break;
    side.hand.push(side.deck.shift());
    drawn += 1;
  }
  return drawn;
}
export function lanePower(cards) {
  let total = 0;
  for (const c of cards) total += c.attack + (c.bonus ?? 0);
  return total;
}
// Bonus a card earns the moment it lands in a lane: Spades +2, plus synergy
// with what is already there (same suit +3, same rank +4 — they stack).
export function landingBonus(card, laneCards) {
  let bonus = card.suit === 'spades' ? 2 : 0;
  let synergy = '';
  if (laneCards.some((c) => c.suit === card.suit)) { bonus += SYNERGY_SAME_SUIT; synergy = 'SYNERGY +3'; }
  if (laneCards.some((c) => c.rank === card.rank)) { bonus += SYNERGY_SAME_RANK; synergy = synergy ? `${synergy} PAIR +4` : 'PAIR +4'; }
  return { bonus, synergy };
}

export function createWorld(random) {
  const state = {
    turn: 1, phase: PHASE_PLAYER, result: null, resultReason: '',
    selected: null, log: [], floats: [], banner: '', bannerTtl: 0,
    lastResolve: null, turnWinner: '',
    player: makeSide(random), ai: makeSide(random),
    lanes: Array.from({ length: LANES }, () => ({ player: [], ai: [] })),
  };
  function say(text) {
    state.log.unshift(text);
    if (state.log.length > 6) state.log.length = 6;
  }
  function float(text, x, y, color) {
    state.floats.push({ text, x, y, color: color ?? '#ffd166', ttl: 1.4 });
  }
  function reset() {
    state.turn = 1; state.phase = PHASE_PLAYER; state.result = null;
    state.resultReason = ''; state.selected = null; state.log = [];
    state.floats = []; state.banner = ''; state.bannerTtl = 0;
    state.lastResolve = null; state.turnWinner = '';
    state.player = makeSide(random); state.ai = makeSide(random);
    state.lanes = Array.from({ length: LANES }, () => ({ player: [], ai: [] }));
    drawCards(state.player, HAND_SIZE_START);
    drawCards(state.ai, HAND_SIZE_START);
    state.player.maxMana = START_MANA; state.player.mana = START_MANA;
    state.ai.maxMana = START_MANA; state.ai.mana = START_MANA;
    say('Round 1 — play cards into the lanes, then End Turn (Space).');
  }
  function applySuitEffect(side, card) {
    if (card.suit === 'hearts') {
      const healed = Math.min(HEAL_ON_HEARTS, START_LIFE - side.life);
      side.life += healed;
      return healed > 0 ? `♥ healed ${healed}` : '♥ already full life';
    }
    if (card.suit === 'diamonds') {
      const n = drawCards(side, 1);
      return n > 0 ? '♦ drew 1 card' : '♦ deck empty';
    }
    if (card.suit === 'clubs') {
      side.mana = Math.min(MAX_MANA, side.mana + MANA_ON_CLUBS);
      return '♣ +1 mana';
    }
    return '♠ +2 lane power';
  }
  function playCardToLane(side, handIndex, laneIndex, isPlayer) {
    const hand = side.hand;
    if (handIndex < 0 || handIndex >= hand.length) return null;
    const card = hand[handIndex];
    if (card.cost > side.mana) return null;
    const lane = state.lanes[laneIndex].player ? state.lanes[laneIndex] : null;
    if (!lane) return null;
    const slot = isPlayer ? lane.player : lane.ai;
    const { bonus, synergy } = landingBonus(card, slot);
    side.mana -= card.cost;
    hand.splice(handIndex, 1);
    slot.push({ ...card, bonus });
    side.cardsPlayed += 1;
    side.score += SCORE_PER_CARD;
    const effect = applySuitEffect(side, card);
    const who = isPlayer ? 'You' : 'Duchess';
    say(`${who} played ${card.label}${card.symbol} (power ${card.attack + bonus}) → Lane ${laneIndex + 1} · ${effect}${synergy ? ` · ${synergy}` : ''}`);
    return { card, bonus, synergy, effect };
  }
  function canPlay(handIndex) {
    if (state.phase !== PHASE_PLAYER || state.result) return false;
    const card = state.player.hand[handIndex];
    return !!card && card.cost <= state.player.mana;
  }
  function playPlayerCard(handIndex, laneIndex) {
    if (!canPlay(handIndex)) return false;
    const played = playCardToLane(state.player, handIndex, laneIndex, true);
    if (!played) return false;
    state.selected = null;
    float(`+${played.card.attack + played.bonus}`, 640, 430, '#ffd166');
    return true;
  }
  // The Duchess: greedy lane evaluation. For each affordable card and lane she
  // scores the swing — flipping a losing lane is worth the most, padding a won
  // lane the least — and plays the best value-per-mana move while she can.
  // Ties break on the seeded stream, never on Math.random.
  function aiTakeTurn() {
    const ai = state.ai;
    let guard = 0;
    while (guard < 12) {
      guard += 1;
      let best = null;
      for (let hi = 0; hi < ai.hand.length; hi += 1) {
        const card = ai.hand[hi];
        if (card.cost > ai.mana) continue;
        for (let li = 0; li < LANES; li += 1) {
          const lane = state.lanes[li];
          const before = lanePower(lane.ai) - lanePower(lane.player);
          const { bonus } = landingBonus(card, lane.ai);
          const after = (lanePower(lane.ai) + card.attack + bonus) - lanePower(lane.player);
          const swing = Math.max(0, after) - Math.max(0, before) + Math.max(0, -before) - Math.max(0, -after);
          const suitValue = card.suit === 'hearts' && ai.life < START_LIFE ? 2 : card.suit === 'diamonds' ? 1 : 0;
          const value = swing + card.attack * 0.2 + suitValue;
          const score = value / card.cost;
          if (!best || score > best.score + 0.001 || (Math.abs(score - best.score) <= 0.001 && random() < 0.5)) {
            best = { score, hi, li };
          }
        }
      }
      if (!best || best.score < 0.4) break;
      playCardToLane(ai, best.hi, best.li, false);
    }
  }
  function resolveRound() {
    const rows = [];
    let playerDamage = 0;
    let aiDamage = 0;
    for (let li = 0; li < LANES; li += 1) {
      const lane = state.lanes[li];
      const p = lanePower(lane.player);
      const a = lanePower(lane.ai);
      let winner = 'tie';
      let damage = 0;
      if (p > a) { winner = 'player'; damage = p - a; playerDamage += damage; }
      else if (a > p) { winner = 'ai'; damage = a - p; aiDamage += damage; }
      rows.push({ lane: li + 1, playerPower: p, aiPower: a, winner, damage });
      state.player.discard.push(...lane.player);
      state.ai.discard.push(...lane.ai);
      lane.player = []; lane.ai = [];
    }
    state.ai.life = Math.max(0, state.ai.life - playerDamage);
    state.player.life = Math.max(0, state.player.life - aiDamage);
    state.player.damageDealt += playerDamage;
    state.ai.damageDealt += aiDamage;
    state.player.score += playerDamage * SCORE_PER_DAMAGE;
    state.ai.score += aiDamage * SCORE_PER_DAMAGE;
    state.lastResolve = rows;
    const won = rows.filter((r) => r.winner === 'player').length;
    const lost = rows.filter((r) => r.winner === 'ai').length;
    state.turnWinner = won > lost ? 'You took the round' : lost > won ? 'Duchess took the round' : 'Round tied';
    state.banner = `${state.turnWinner} — you dealt ${playerDamage}, took ${aiDamage}`;
    state.bannerTtl = 2.2;
    say(state.banner);
    float(`-${aiDamage}`, 640, 180, '#ff5d5d');
    float(`-${playerDamage}`, 640, 540, '#7ee081');
  }
  function finishIfOver() {
    const p = state.player;
    const a = state.ai;
    if (a.life <= 0 && p.life <= 0) { endGame('draw', 'Both courts fell in the same round.'); return true; }
    if (a.life <= 0) { endGame('win', `The Duchess falls — ${p.life} life left, ${state.turn} rounds.`); return true; }
    if (p.life <= 0) { endGame('loss', `Your court falls — the Duchess had ${a.life} life left.`); return true; }
    if (state.turn >= MAX_TURNS) {
      if (p.life > a.life) endGame('win', `After ${MAX_TURNS} rounds you lead ${p.life}–${a.life} on life.`);
      else if (a.life > p.life) endGame('loss', `After ${MAX_TURNS} rounds the Duchess leads ${a.life}–${p.life} on life.`);
      else endGame('draw', `After ${MAX_TURNS} rounds the courts stand even at ${p.life} life.`);
      return true;
    }
    return false;
  }
  function endGame(result, reason) {
    state.result = result; state.resultReason = reason; state.phase = PHASE_OVER;
    if (result === 'win') state.player.score += SCORE_PER_WIN + (MAX_TURNS - state.turn) * TIME_BONUS_PER_TURN_LEFT;
    say(reason);
  }
  function endTurn() {
    if (state.phase !== PHASE_PLAYER || state.result) return false;
    aiTakeTurn();
    resolveRound();
    if (finishIfOver()) return true;
    state.turn += 1;
    const mana = Math.min(MAX_MANA, START_MANA + state.turn - 1);
    state.player.maxMana = mana; state.player.mana = mana;
    state.ai.maxMana = mana; state.ai.mana = mana;
    drawCards(state.player, DRAW_PER_TURN);
    drawCards(state.ai, DRAW_PER_TURN);
    say(`Round ${state.turn} — ${mana} mana, draw ${DRAW_PER_TURN}.`);
    return true;
  }
  function step(dt) {
    for (const f of state.floats) f.ttl -= dt;
    state.floats = state.floats.filter((f) => f.ttl > 0);
    if (state.bannerTtl > 0) state.bannerTtl -= dt;
  }
  reset();
  return {
    state, reset, step, canPlay, playPlayerCard, endTurn,
    lanePower, playCardToLane, aiTakeTurn, resolveRound, finishIfOver,
  };
}
