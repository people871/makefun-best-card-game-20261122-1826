// Scripted checks against the real rules (?selftest=1). Runs in the browser,
// sets window.__selftest = { passed, total, checks: [{name, pass, detail}] }.
// No DOM, no network, no randomness beyond the seeded stream.
import { createRandom } from './random.js';
import { buildDeck } from './deck.js';
import { createWorld, lanePower, landingBonus } from './world.js';
import { cardCost, START_LIFE } from './config.js';

export function runSelftest() {
  const checks = [];
  function check(name, pass, detail = '') { checks.push({ name, pass: !!pass, detail: String(detail) }); }
  // Deck: 52 unique cards, 13 per suit, costs in bands.
  const deck = buildDeck();
  check('deck52', deck.length === 52, `n=${deck.length}`);
  check('deckUnique', new Set(deck.map((c) => c.id)).size === 52, 'ids unique');
  check('deckSuits', ['spades', 'hearts', 'diamonds', 'clubs'].every((s) => deck.filter((c) => c.suit === s).length === 13), '13 per suit');
  check('costBands', cardCost(2) === 1 && cardCost(5) === 2 && cardCost(8) === 3 && cardCost(11) === 4 && cardCost(14) === 5, '1/2/3/4/5');
  check('aceAttack14', deck.find((c) => c.rank === 14).attack === 14, 'A=14');
  // A fresh world: both at 30 life, 5 cards each, decks 47.
  const w = createWorld(createRandom(7));
  const s = w.state;
  check('startLife', s.player.life === START_LIFE && s.ai.life === START_LIFE, `${s.player.life}/${s.ai.life}`);
  check('startHand5', s.player.hand.length === 5 && s.ai.hand.length === 5, `${s.player.hand.length}/${s.ai.hand.length}`);
  check('startDeck47', s.player.deck.length === 47 && s.ai.deck.length === 47, `${s.player.deck.length}`);
  check('startMana3', s.player.mana === 3, `mana=${s.player.mana}`);
  // Playing a card costs mana, lands in the lane, and heals on hearts.
  const before = s.player.mana;
  const idx = s.player.hand.findIndex((c) => c.cost <= before);
  const played = w.playPlayerCard(idx, 0);
  check('playCard', played && s.lanes[0].player.length === 1, `played=${played}`);
  const playedCard = s.lanes[0].player[0];
  const expectedMana = before - playedCard.cost + (playedCard.suit === 'clubs' ? 1 : 0);
  check('manaSpent', s.player.mana === expectedMana, `mana ${before}->${s.player.mana} (cost ${playedCard.cost}, ${playedCard.suit})`);
  // Too-expensive card is refused.
  const rich = s.player.hand.findIndex((c) => c.cost > s.player.mana);
  if (rich >= 0) check('expensiveRefused', w.playPlayerCard(rich, 1) === false, 'refused');
  else check('expensiveRefused', true, 'no expensive card in hand this seed');
  // Synergy: same suit in a lane adds +3, same rank adds +4.
  const b1 = landingBonus({ suit: 'spades', rank: 9 }, [{ suit: 'spades', rank: 4 }]);
  check('synergySuit', b1.bonus === 5 && b1.synergy.includes('SYNERGY'), `bonus=${b1.bonus}`);
  const b2 = landingBonus({ suit: 'hearts', rank: 9 }, [{ suit: 'clubs', rank: 9 }]);
  check('synergyRank', b2.bonus === 4 && b2.synergy.includes('PAIR'), `bonus=${b2.bonus}`);
  check('lanePower', lanePower([{ attack: 10, bonus: 2 }, { attack: 5, bonus: 0 }]) === 17, '10+2+5');
  // End turn: AI plays, lanes resolve, a new round starts with more mana.
  const turnBefore = s.turn;
  const ended = w.endTurn();
  check('endTurn', ended && s.turn === turnBefore + 1, `turn ${turnBefore}->${s.turn}`);
  check('lanesCleared', s.lanes.every((l) => l.player.length === 0 && l.ai.length === 0), 'cleared after resolve');
  check('manaGrows', s.player.mana === 4, `mana=${s.player.mana}`);
  check('drewCards', s.player.hand.length >= 5, `hand=${s.player.hand.length}`);
  check('resolveLogged', !!s.lastResolve && s.lastResolve.length === 3, '3 lane rows');
  // Determinism: same seed, same first hand.
  const w2 = createWorld(createRandom(7));
  check('deterministic', JSON.stringify(w2.state.player.hand) === JSON.stringify(createWorld(createRandom(7)).state.player.hand), 'seed 7 repeats');
  const w3 = createWorld(createRandom(7));
  const firstHand = JSON.stringify(w3.state.player.hand);
  const w4 = createWorld(createRandom(7));
  check('deterministic2', JSON.stringify(w4.state.player.hand) === firstHand, 'seed 7 repeats twice');
  // Win path: set the Duchess to 1 life, give the player a huge lane, resolve.
  const w5 = createWorld(createRandom(11));
  w5.state.ai.life = 1;
  w5.state.lanes[0].player = [{ attack: 14, bonus: 2, suit: 'spades', rank: 14 }];
  w5.resolveRound();
  const over = w5.finishIfOver();
  check('winPath', over && w5.state.result === 'win', `result=${w5.state.result}`);
  check('winScore', w5.state.player.score >= 500, `score=${w5.state.player.score}`);
  // Loss path: player at 1 life, Duchess lane crushes.
  const w6 = createWorld(createRandom(12));
  w6.state.player.life = 1;
  w6.state.lanes[0].ai = [{ attack: 14, bonus: 2, suit: 'spades', rank: 14 }];
  w6.resolveRound();
  const over6 = w6.finishIfOver();
  check('lossPath', over6 && w6.state.result === 'loss', `result=${w6.state.result}`);
  // AI actually plays cards when it can afford them.
  const w7 = createWorld(createRandom(3));
  w7.state.ai.hand = [{ id: 'spades-14', suit: 'spades', symbol: '♠', suitColor: '#000', rank: 14, label: 'A', cost: 5, attack: 14 }];
  w7.state.ai.mana = 5;
  w7.aiTakeTurn();
  check('aiPlays', w7.state.lanes.some((l) => l.ai.length === 1), 'AI placed its Ace');
  // Full game simulation: play greedily to the end, it must terminate.
  const w8 = createWorld(createRandom(42));
  let steps = 0;
  while (!w8.state.result && steps < 40) {
    steps += 1;
    const p = w8.state.player;
    let moved = false;
    for (let i = 0; i < p.hand.length; i += 1) {
      if (p.hand[i].cost <= p.mana) { w8.playPlayerCard(i, steps % 3); moved = true; break; }
    }
    if (!moved) w8.endTurn(); else w8.endTurn();
  }
  check('fullGameEnds', !!w8.state.result && steps <= 40, `result=${w8.state.result} in ${steps} rounds`);
  const passed = checks.filter((c) => c.pass).length;
  return { passed, total: checks.length, checks };
}
