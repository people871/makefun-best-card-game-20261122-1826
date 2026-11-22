// Staged screenshots. Each shot builds a deterministic scene from the real
// rules (real cards, real lane powers, real life totals) and paints it twice,
// then sets window.__shotReady. The money shot is the PLAY frame: both hands,
// three lanes with cards on both sides, lane powers, both life bars, mana,
// deck counts and score all in one frame.
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSS } from './render.js';
import { lanePower } from './world.js';

function fillLane(world, laneIndex, playerCards, aiCards) {
  const lane = world.state.lanes[laneIndex];
  lane.player = playerCards.map((c) => ({ ...c, bonus: c.suit === 'spades' ? 2 : 0 }));
  lane.ai = aiCards.map((c) => ({ ...c, bonus: c.suit === 'spades' ? 2 : 0 }));
}
function card(suit, symbol, color, rank, label) {
  return { id: `${suit}-${rank}`, suit, symbol, suitColor: color, rank, label, cost: 1 + Math.floor((rank - 2) / 3), attack: rank };
}
export function stageShot(name, world) {
  const s = world.state;
  if (name === 'start') return { screen: SCREEN_TITLE, best: 1240 };
  if (name === 'win') {
    s.ai.life = 0; s.player.life = 18; s.player.score = 2840; s.player.cardsPlayed = 14;
    s.player.damageDealt = 30; s.turn = 8;
    s.result = 'win'; s.resultReason = 'The Duchess falls — 18 life left, 8 rounds.';
    return { screen: SCREEN_WIN, best: 2840 };
  }
  if (name === 'loss') {
    s.player.life = 0; s.ai.life = 11; s.player.score = 1310; s.player.cardsPlayed = 11;
    s.player.damageDealt = 19; s.turn = 9;
    s.result = 'loss'; s.resultReason = 'Your court falls — the Duchess had 11 life left.';
    return { screen: SCREEN_LOSS, best: 2840 };
  }
  // play: a rich mid-game, round 5, both hands full, every lane contested.
  s.turn = 5; s.player.life = 24; s.ai.life = 19;
  s.player.mana = 6; s.player.maxMana = 6; s.player.score = 640;
  s.player.deck = s.player.deck.slice(0, 18); s.ai.deck = s.ai.deck.slice(0, 21);
  s.player.hand = [
    card('spades', '♠', '#1c2733', 14, 'A'), card('hearts', '♥', '#c2253f', 12, 'Q'),
    card('diamonds', '♦', '#b3541e', 9, '9'), card('clubs', '♣', '#1e6b3a', 7, '7'),
    card('spades', '♠', '#1c2733', 5, '5'),
  ];
  s.ai.hand = [{}, {}, {}, {}, {}].map(() => ({ label: '', symbol: '♠', suitColor: '#000', cost: 0, attack: 0 }));
  fillLane(world, 0,
    [card('spades', '♠', '#1c2733', 13, 'K'), card('hearts', '♥', '#c2253f', 8, '8')],
    [card('clubs', '♣', '#1e6b3a', 10, '10')]);
  fillLane(world, 1,
    [card('diamonds', '♦', '#b3541e', 11, 'J')],
    [card('spades', '♠', '#1c2733', 12, 'Q'), card('hearts', '♥', '#c2253f', 6, '6')]);
  fillLane(world, 2,
    [card('clubs', '♣', '#1e6b3a', 14, 'A')],
    [card('diamonds', '♦', '#b3541e', 9, '9')]);
  s.lastResolve = [0, 1, 2].map((li) => {
    const p = lanePower(s.lanes[li].player); const a = lanePower(s.lanes[li].ai);
    return { lane: li + 1, playerPower: p, aiPower: a, winner: p > a ? 'player' : a > p ? 'ai' : 'tie', damage: Math.abs(p - a) };
  });
  s.selected = 0;
  s.log = ['You played A♠ (power 16) → Lane 3 · ♠ +2 lane power', 'Duchess played Q♠ → Lane 2'];
  s.banner = 'Round 5 — your move: a card is selected, pick a lane';
  s.bannerTtl = 99;
  return { screen: SCREEN_PLAY, best: 1240 };
}
