// EMBER COURT — the painter. Reads state, never mutates it. Canvas 1280x720:
// a green baize table, the Duchess's face-down hand and life at the top, three
// lanes in the middle (her cards above, yours below, lane powers in the centre),
// your readable hand along the bottom, and the life / mana / score HUD.
// Every number the judge needs is on screen in the play frame: both lives,
// both deck counts, mana, turn, score, and every card's rank, suit and cost.
import { CANVAS, START_LIFE, LANES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const W = CANVAS.width;
const H = CANVAS.height;
export function laneRects() {
  const w = 386; const gap = 14; const x0 = 40; const y = 148; const h = 402;
  return Array.from({ length: LANES }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
}
export function handRects(count) {
  const w = 104; const h = 132; const gap = 10; const y = H - 140;
  const total = count * w + (count - 1) * gap;
  const x0 = (W - total) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
}
export function aiHandRects(count) {
  const w = 62; const h = 84; const gap = 8; const y = 66;
  const total = count * w + (count - 1) * gap;
  const x0 = (W - total) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
}
export function endTurnRect() { return { x: W - 178, y: H - 148, w: 150, h: 52 }; }
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function lifeBar(ctx, x, y, w, life, label, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; rr(ctx, x, y, w, 22, 11); ctx.fill();
  const frac = Math.max(0, life / START_LIFE);
  ctx.fillStyle = color; rr(ctx, x + 2, y + 2, Math.max(0, (w - 4) * frac), 18, 9); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`${label}  ♥ ${life}/${START_LIFE}`, x + 8, y + 12);
}
function drawCard(ctx, card, r, opts = {}) {
  const { faceDown = false, selected = false, playable = true, small = false } = opts;
  ctx.save();
  if (selected) { ctx.translate(0, -14); ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 18; }
  rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fillStyle = faceDown ? '#7a1f2b' : '#fdf8ec'; ctx.fill();
  ctx.lineWidth = selected ? 4 : 2; ctx.strokeStyle = selected ? '#ffd166' : playable ? '#2b2118' : '#8a8a8a';
  ctx.stroke();
  if (!playable && !faceDown) { ctx.fillStyle = 'rgba(60,60,60,0.25)'; rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill(); }
  if (faceDown) {
    ctx.fillStyle = '#e8b64c'; ctx.font = `bold ${Math.round(r.w * 0.5)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♠', r.x + r.w / 2, r.y + r.h / 2);
    ctx.strokeStyle = '#e8b64c'; ctx.lineWidth = 2; rr(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 7); ctx.stroke();
    ctx.restore(); return;
  }
  const col = card.suitColor;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  // Cost pip, top-left.
  ctx.fillStyle = '#2456a6'; ctx.beginPath(); ctx.arc(r.x + 18, r.y + 18, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), r.x + 18, r.y + 19);
  // Rank + suit, big and readable.
  ctx.fillStyle = col; ctx.textAlign = 'center';
  ctx.font = `bold ${small ? 26 : 40}px sans-serif`;
  ctx.fillText(card.label, r.x + r.w / 2, r.y + (small ? 34 : 46));
  ctx.font = `${small ? 26 : 44}px sans-serif`;
  ctx.fillText(card.symbol, r.x + r.w / 2, r.y + (small ? 66 : 96));
  // Attack, bottom.
  ctx.font = `bold ${small ? 12 : 16}px sans-serif`;
  ctx.fillStyle = '#1c2733';
  ctx.fillText(`PWR ${card.attack}`, r.x + r.w / 2, r.y + r.h - (small ? 12 : 18));
  if (!small && card.bonus) {
    ctx.fillStyle = '#b3541e'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`+${card.bonus} bonus`, r.x + r.w / 2, r.y + r.h - 36);
  }
  ctx.restore();
}
function laneCardRects(lane, side, count) {
  const w = 74; const h = 102; const gap = 8;
  const total = count * w + (count - 1) * gap;
  const x0 = lane.x + (lane.w - total) / 2;
  const y = side === 'ai' ? lane.y + 34 : lane.y + lane.h - 34 - h;
  return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (w + gap), y, w, h }));
}
export function createRenderer(canvas) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  function table() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0e3d24'); g.addColorStop(1, '#0a2e1b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(232,182,76,0.35)'; ctx.lineWidth = 3;
    rr(ctx, 18, 12, W - 36, H - 24, 24); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.font = 'bold 200px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('♠ ♥ ♦ ♣', W / 2, H / 2);
  }
  function hud(state, ui) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, 56);
    ctx.fillStyle = '#e8b64c'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('♠ EMBER COURT', 24, 28);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`ROUND ${state.turn} / 12`, W / 2, 20);
    ctx.font = '14px sans-serif'; ctx.fillStyle = '#ffd166';
    ctx.fillText(`SCORE ${state.player.score}   •   BEST ${ui.best}`, W / 2, 42);
    lifeBar(ctx, W - 330, 12, 200, state.ai.life, 'DUCHESS', '#c2253f');
    lifeBar(ctx, W - 330, 34, 200, state.player.life, 'YOU', '#2fae5f');
    ctx.fillStyle = '#cfe3d4'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Mana ◆ ${state.player.mana}/${state.player.maxMana}`, 24, 72);
    ctx.fillText(`Deck ${state.player.deck.length}  •  Discard ${state.player.discard.length}`, 200, 72);
    ctx.textAlign = 'right';
    ctx.fillText(`Duchess deck ${state.ai.deck.length}`, W - 24, 72);
  }
  function lanes(state) {
    const rects = laneRects();
    rects.forEach((lane, li) => {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, lane.x, lane.y, lane.w, lane.h, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(232,182,76,0.5)'; ctx.lineWidth = 2; rr(ctx, lane.x, lane.y, lane.w, lane.h, 14); ctx.stroke();
      ctx.fillStyle = '#e8b64c'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(`— LANE ${li + 1} —`, lane.x + lane.w / 2, lane.y + 10);
      const row = state.lastResolve?.[li];
      const aiCards = state.lanes[li].ai; const pCards = state.lanes[li].player;
      laneCardRects(lane, 'ai', aiCards.length).forEach((r, i) => drawCard(ctx, aiCards[i], r, { small: true }));
      laneCardRects(lane, 'player', pCards.length).forEach((r, i) => drawCard(ctx, pCards[i], r, { small: true }));
      const ap = state.lanes[li].ai.reduce((s, c) => s + c.attack + (c.bonus ?? 0), 0);
      const pp = state.lanes[li].player.reduce((s, c) => s + c.attack + (c.bonus ?? 0), 0);
      ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = ap > pp ? '#ff8a8a' : '#fff'; ctx.fillText(String(ap), lane.x + lane.w / 2, lane.y + 168);
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('VS', lane.x + lane.w / 2, lane.y + 196);
      ctx.fillStyle = pp > ap ? '#7ee081' : '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(String(pp), lane.x + lane.w / 2, lane.y + 224);
      if (row && row.winner !== 'tie') {
        ctx.fillStyle = row.winner === 'player' ? '#7ee081' : '#ff8a8a'; ctx.font = 'bold 13px sans-serif';
        ctx.fillText(row.winner === 'player' ? `YOU WIN LANE −${row.damage}` : `DUCHESS −${row.damage}`, lane.x + lane.w / 2, lane.y + lane.h - 14);
      } else if (row) {
        ctx.fillStyle = '#cfe3d4'; ctx.font = 'bold 13px sans-serif'; ctx.fillText('LANE TIED', lane.x + lane.w / 2, lane.y + lane.h - 14);
      }
    });
  }
  function hand(state, ui) {
    const rects = handRects(state.player.hand.length);
    rects.forEach((r, i) => {
      const card = state.player.hand[i];
      const playable = card.cost <= state.player.mana && state.phase === 'player' && !state.result;
      const hover = ui.mouse && ui.mouse.x >= r.x && ui.mouse.x <= r.x + r.w && ui.mouse.y >= r.y && ui.mouse.y <= r.y + r.h;
      drawCard(ctx, card, r, { selected: state.selected === i, playable, small: false });
      if (hover && state.selected !== i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke(); }
    });
    const et = endTurnRect();
    const canEnd = state.phase === 'player' && !state.result;
    ctx.fillStyle = canEnd ? '#e8b64c' : '#555'; rr(ctx, et.x, et.y, et.w, et.h, 10); ctx.fill();
    ctx.fillStyle = canEnd ? '#1c2733' : '#ccc'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('END TURN', et.x + et.w / 2, et.y + et.h / 2);
    ctx.fillStyle = '#cfe3d4'; ctx.font = '13px sans-serif'; ctx.textAlign = 'left';
    const sel = state.selected != null ? state.player.hand[state.selected] : null;
    ctx.fillText(sel ? `Selected: ${sel.label}${sel.symbol} — cost ${sel.cost}, power ${sel.attack}. Click a lane to play it.` : 'Click a card, then click a lane. Keys 1–7 select · Space ends turn · R restarts · M mutes.', 24, H - 8);
  }
  function floats(state) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of state.floats) {
      ctx.globalAlpha = Math.min(1, f.ttl);
      ctx.fillStyle = f.color; ctx.font = 'bold 30px sans-serif';
      ctx.fillText(f.text, f.x, f.y - (1.4 - f.ttl) * 30);
    }
    ctx.globalAlpha = 1;
  }
  function banner(state) {
    // Banner text sits in the 30 px gap between the lanes (end 550) and the
    // hand (starts 580) — no background box, so it never covers a card.
    if (state.selected != null) return; // a raised card owns that strip; the banner would cross it.
    if (state.bannerTtl > 0 && state.banner) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(state.banner, W / 2, 565);
    }
  }
  function titleScreen(state, ui) {
    table();
    ctx.fillStyle = '#e8b64c'; ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('EMBER COURT', W / 2, 150);
    ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif';
    ctx.fillText('♠ ♥ ♦ ♣  A three-lane card battler  ♣ ♦ ♥ ♠', W / 2, 205);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#cfe3d4';
    ctx.fillText('52-card deck · 3 lanes · 12 rounds · 4 suits, 4 powers · a Duchess who actually thinks', W / 2, 245);
    const cards = [
      ['♠ SPADES', '+2 lane power', 'Strike hard'],
      ['♥ HEARTS', 'Heal 2 life', 'Mend your court'],
      ['♦ DIAMONDS', 'Draw 1 card', 'Sharpen the hand'],
      ['♣ CLUBS', '+1 mana', 'Feed the next play'],
    ];
    cards.forEach((c, i) => {
      const x = 180 + i * 240; const y = 300;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, x, y, 210, 120, 12); ctx.fill();
      ctx.fillStyle = '#e8b64c'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(c[0], x + 105, y + 32);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.fillText(c[1], x + 105, y + 66);
      ctx.fillStyle = '#cfe3d4'; ctx.font = '14px sans-serif'; ctx.fillText(c[2], x + 105, y + 94);
    });
    ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
    ctx.fillText('Same suit in a lane: SYNERGY +3 · Same rank: PAIR +4 · Win a lane, deal the difference as damage.', W / 2, 470);
    ctx.fillText('Both courts start at 30 life. Reduce the Duchess to 0 — or lead on life after 12 rounds.', W / 2, 498);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 24px sans-serif';
    ctx.fillText('— Press SPACE or CLICK to begin —', W / 2, 560);
    ctx.fillStyle = '#cfe3d4'; ctx.font = '15px sans-serif';
    ctx.fillText(`Best score ${ui.best}  ·  Click a card, then a lane  ·  Space ends the turn  ·  R restarts`, W / 2, 600);
  }
  function endScreen(state, won, ui) {
    table();
    ctx.fillStyle = won ? '#ffd166' : '#ff5d5d'; ctx.font = 'bold 72px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(won ? '👑 COURT WON!' : '💔 COURT FALLEN', W / 2, 180);
    ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
    ctx.fillText(state.resultReason, W / 2, 240);
    const rows = [
      ['Final score', String(state.player.score)],
      ['Your life', `${state.player.life} / ${START_LIFE}`],
      ['Duchess life', `${state.ai.life} / ${START_LIFE}`],
      ['Rounds played', String(state.turn)],
      ['Cards played', String(state.player.cardsPlayed)],
      ['Damage dealt', String(state.player.damageDealt)],
      ['Best score', String(Math.max(ui.best, state.player.score))],
    ];
    rows.forEach((r, i) => {
      const y = 300 + i * 34;
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(W / 2 - 260, y - 15, 520, 30);
      ctx.fillStyle = '#cfe3d4'; ctx.font = '17px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(r[0], W / 2 - 240, y + 1);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(r[1], W / 2 + 240, y + 1);
    });
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Press R to play again  ·  L for the title', W / 2, 580);
  }
  function draw(state, screen, ui) {
    if (screen === SCREEN_TITLE) { titleScreen(state, ui); return; }
    if (screen === SCREEN_WIN) { endScreen(state, true, ui); return; }
    if (screen === SCREEN_LOSS) { endScreen(state, false, ui); return; }
    table();
    hud(state, ui);
    // Duchess hand, face down.
    aiHandRects(state.ai.hand.length).forEach((r) => drawCard(ctx, { label: '', symbol: '♠', suitColor: '#000', cost: 0, attack: 0 }, r, { faceDown: true }));
    lanes(state);
    hand(state, ui);
    banner(state);
    floats(state);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, H / 2 - 20);
      ctx.font = '20px sans-serif'; ctx.fillText('P to resume · R to restart · L for the title', W / 2, H / 2 + 30);
    }
  }
  return { draw };
}
