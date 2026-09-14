export function chooseNextTrackIndex({ trackCount, currentIndex, shuffle, random = Math.random }) {
  if (trackCount < 2) return currentIndex;
  if (!shuffle) return (currentIndex + 1) % trackCount;
  const choice = Math.min(trackCount - 2, Math.floor(random() * (trackCount - 1)));
  return choice >= currentIndex ? choice + 1 : choice;
}

export function insertTrack(queue, track, insertionIndex = queue.length) {
  const destination = Math.max(0, Math.min(queue.length, Number(insertionIndex) || 0));
  const result = queue.slice();
  result.splice(destination, 0, track);
  return result;
}

export function replaceTrack(queue, index, track) {
  if (index < 0 || index >= queue.length) return queue.slice();
  const result = queue.slice();
  result[index] = track;
  return result;
}

export function moveTrack(tracks, fromIndex, insertionIndex) {
  if (fromIndex < 0 || fromIndex >= tracks.length) return tracks.slice();
  const reordered = tracks.slice();
  const [moved] = reordered.splice(fromIndex, 1);
  let destination = insertionIndex;
  if (fromIndex < destination) destination -= 1;
  destination = Math.max(0, Math.min(reordered.length, destination));
  reordered.splice(destination, 0, moved);
  return reordered;
}
