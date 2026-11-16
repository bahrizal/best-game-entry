// Keyboard and mouse, read once a frame. Movement keys give a direction vector, the
// mouse gives an aim point in field coordinates, and takeActions reports the buttons
// pressed since the last frame as a bitmask.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

const MOVE_KEYS = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  let mouse = { x: FIELD.width / 2, y: FIELD.height / 2 - 120 };
  let mouseDown = false;
  let queued = 0;
  let choice = -1;

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') queued |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    if (event.code === 'KeyR') queued |= ACTION_RESTART;
    if (event.code === 'KeyM') queued |= ACTION_MUTE;
    if (event.code === 'Digit1') choice = 0;
    if (event.code === 'Digit2') choice = 1;
    if (event.code === 'Digit3') choice = 2;
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    mouse = toField(event.clientX, event.clientY);
  });
  canvas.addEventListener('mousedown', (event) => {
    mouse = toField(event.clientX, event.clientY);
    mouseDown = true;
    queued |= ACTION_CONFIRM;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });

  return {
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const d = MOVE_KEYS[code];
        if (d) {
          x += d[0];
          y += d[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len };
    },
    aim() {
      return mouse;
    },
    isMouseDown() {
      return mouseDown;
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    takeChoice() {
      const picked = choice;
      choice = -1;
      return picked;
    },
  };
}
