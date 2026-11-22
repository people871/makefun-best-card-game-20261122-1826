// Keyboard + mouse input. Keys 1-7 select a hand card, 1-3 (with a card
// selected) is not used — lanes are clicked — Space/Enter ends the turn,
// R restarts, M mutes, P pauses, Esc backs to the title. Mouse clicks are
// translated by the caller into hand/lane/button hits; this module only
// records the raw presses and hands them over once, so a held key never
// fires twice.
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_RESTART = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;
export const ACTION_TITLE = 32;

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouse = { x: 0, y: 0, clicked: false, down: false };
  function keyName(e) { return e.code; }
  function onKeyDown(e) {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (!e.repeat) pressed.add(keyName(e));
    keys.add(keyName(e));
  }
  function onKeyUp(e) { keys.delete(keyName(e)); }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  }
  function onMouseDown(e) { onMouseMove(e); mouse.down = true; mouse.clicked = true; }
  function onMouseUp() { mouse.down = false; }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  function takeActions() {
    let actions = 0;
    if (pressed.has('Space') || pressed.has('Enter')) actions |= ACTION_CONFIRM | ACTION_END_TURN;
    if (pressed.has('KeyR')) actions |= ACTION_RESTART;
    if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
    if (pressed.has('KeyM')) actions |= ACTION_MUTE;
    if (pressed.has('KeyL')) actions |= ACTION_TITLE;
    let digit = -1;
    for (let d = 1; d <= 7; d += 1) if (pressed.has(`Digit${d}`)) digit = d - 1;
    pressed.clear();
    return { actions, digit, mouse };
  }
  function takeClick() {
    const c = mouse.clicked;
    mouse.clicked = false;
    return c ? { x: mouse.x, y: mouse.y } : null;
  }
  function mousePos() { return { x: mouse.x, y: mouse.y }; }
  return { takeActions, takeClick, mousePos, keys };
}
