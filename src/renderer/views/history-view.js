import { createHistoryScrollGate } from '../models/history-scroll.js';

// Render only the visible slice; the session retains every listening entry.
export function createHistoryView({ scroll, section, list, boundary, currentLabel, onPlay }) {
  const ROW_HEIGHT = 58;
  const scrollGate = createHistoryScrollGate();
  let history = [];
  let frame = null;
  function paintRows() {
    frame = null;
    const offset = Math.max(0, scroll.scrollTop - section.offsetTop - 30);
    const start = Math.max(0, Math.floor(offset / ROW_HEIGHT) - 5);
    const end = Math.min(history.length, start + Math.ceil(scroll.clientHeight / ROW_HEIGHT) + 12);
    list.replaceChildren();
    for (let index = start; index < end; index += 1) {
      const track = history[index];
      const row = document.createElement('li');
      row.style.top = `${index * ROW_HEIGHT}px`;
      row.setAttribute('aria-posinset', String(index + 1));
      row.setAttribute('aria-setsize', String(history.length));
      const button = document.createElement('button');
      const title = document.createElement('b');
      const artist = document.createElement('small');
      title.textContent = track.title;
      artist.textContent = track.artist;
      button.append(title, artist);
      button.title = `Play ${track.title} again`;
      button.addEventListener('click', () => onPlay(track));
      row.append(button);
      list.append(row);
    }
  }
  scroll.addEventListener('wheel', (event) => {
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroll.clientHeight : 1;
    const stopAt = scrollGate.wheel({
      top: scroll.scrollTop, boundary: boundary.offsetTop,
      delta: event.deltaY * scale, time: performance.now()
    });
    if (stopAt !== null) {
      event.preventDefault();
      scroll.scrollTop = stopAt;
    }
  }, { passive: false });
  scroll.addEventListener('scroll', () => {
    if (frame === null) frame = requestAnimationFrame(paintRows);
  });
  return {
    render(entries, current) {
      history = entries;
      section.hidden = history.length === 0;
      list.style.height = `${history.length * ROW_HEIGHT}px`;
      currentLabel.hidden = !current;
      currentLabel.textContent = current ? `NOW PLAYING · ${current.title}` : '';
      // A full-height upcoming section keeps the history above the initial viewport.
      scrollGate.reset();
      scroll.scrollTop = boundary.offsetTop;
      paintRows();
    }
  };
}
