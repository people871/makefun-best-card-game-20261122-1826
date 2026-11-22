// EMBER COURT — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, the renderer paints what is there. Screens:
// title, play, paused, win, loss. Mouse: click a hand card to select it, click
// a lane to play it, click END TURN to hand over to the Duchess. Keyboard:
// 1-7 select, Space ends the turn, R restarts, M mutes, P pauses, L title.
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. ?selftest=1 runs the scripted checks.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_RESTART, ACTION_PAUSE, ACTION_MUTE, ACTION_TITLE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WIN, SCREEN_LOSS, laneRects, handRects, endTurnRect } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { runSelftest } from './selftest.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
window.__mv = { world, screen: SCREEN_TITLE };

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private mode: best lasts this visit only */ }
}
function announce(message) { status.textContent = message; }
function hit(rect, x, y) { return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h; }

if (params.get('selftest') === '1') {
  window.__selftest = runSelftest();
} else if (shot) {
  const scene = stageShot(shot, world);
  window.__mv.screen = scene.screen;
  let painted = 0;
  (function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, mouse: { x: -1, y: -1 } });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint); else window.__shotReady = true;
  }());
} else {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let prevResult = null;
  function startGame() {
    world.reset();
    screen = SCREEN_PLAY;
    announce('Playing. Reduce the Duchess to 0 life — or lead on life after 12 rounds.');
  }
  function handleActions() {
    const { actions, digit, mouse } = input.takeActions();
    if (actions & ACTION_MUTE) { const m = audio.toggleMute(); announce(m ? 'Muted.' : 'Sound on.'); }
    if (actions & ACTION_RESTART) { startGame(); audio.click(); return; }
    if (actions & ACTION_TITLE) { screen = SCREEN_TITLE; world.reset(); return; }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      return;
    }
    const click = input.takeClick();
    if (screen === SCREEN_TITLE) {
      if ((actions & ACTION_CONFIRM) || click) { startGame(); audio.play(); }
      return;
    }
    if (screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      if ((actions & ACTION_CONFIRM) || click) startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (digit >= 0 && digit < world.state.player.hand.length) {
      world.state.selected = world.state.selected === digit ? null : digit;
      audio.click();
    }
    if (click) {
      const { x, y } = click;
      if (hit(endTurnRect(), x, y)) {
        if (world.endTurn()) { audio.damage(); announce(world.state.banner); }
        return;
      }
      const hand = handRects(world.state.player.hand.length);
      for (let i = 0; i < hand.length; i += 1) {
        if (hit(hand[i], x, y)) { world.state.selected = world.state.selected === i ? null : i; audio.click(); return; }
      }
      if (world.state.selected != null) {
        const lanes = laneRects();
        for (let li = 0; li < lanes.length; li += 1) {
          if (hit(lanes[li], x, y)) {
            const card = world.state.player.hand[world.state.selected];
            if (card && world.playPlayerCard(world.state.selected, li)) {
              if (card.suit === 'hearts') audio.heal(); else audio.play();
            }
            return;
          }
        }
      }
    }
    if (actions & ACTION_END_TURN) {
      if (world.endTurn()) { audio.damage(); announce(world.state.banner); }
    }
  }
  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) { world.step(STEP); accumulator -= STEP; }
      const r = world.state.result;
      if (r && r !== prevResult) {
        prevResult = r;
        screen = r === 'win' ? SCREEN_WIN : r === 'loss' ? SCREEN_LOSS : SCREEN_TITLE;
        if (r === 'win') audio.win(); else if (r === 'loss') audio.lose();
        if (world.state.player.score > best) { best = world.state.player.score; saveBest(best); }
        announce(world.state.resultReason);
      }
    }
    renderer.draw(world.state, screen, { best, mouse: input.mousePos() });
    requestAnimationFrame(frame);
  }
  window.__mv.screen = screen;
  // Keep the debug handle's screen in step with the real one.
  const origDraw = renderer.draw;
  renderer.draw = (state, scr, ui) => { window.__mv.screen = scr; return origDraw(state, scr, ui); };
  requestAnimationFrame(frame);
}
