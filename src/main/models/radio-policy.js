function normalizedWords(value) {
  return new Set(String(value || '').toLocaleLowerCase().split(/[,;/|]+/).map((word) => word.trim()).filter(Boolean));
}

function sharesGenre(left, right) {
  const leftGenres = normalizedWords(left);
  return [...normalizedWords(right)].some((rightGenre) => [...leftGenres].some((leftGenre) =>
    leftGenre === rightGenre || leftGenre.includes(rightGenre) || rightGenre.includes(leftGenre)
  ));
}

function recentPenalty(lastPlayedAt, now = Date.now()) {
  if (!lastPlayedAt) return 0;
  const ageHours = (now - new Date(`${lastPlayedAt}Z`).getTime()) / 3_600_000;
  if (!Number.isFinite(ageHours) || ageHours < 0) return 0;
  if (ageHours < 1) return 14;
  if (ageHours < 24) return 8;
  if (ageHours < 24 * 7) return 3;
  return 0;
}

function yearDistance(left, right) {
  const first = Number(left);
  const second = Number(right);
  return first > 0 && second > 0 ? Math.abs(first - second) : null;
}

function scoreRadioCandidate(candidate, anchor, { random = Math.random, now = Date.now() } = {}) {
  let score = random() * 2.5;
  score += Math.log1p(Math.max(0, candidate.playCount || 0)) * 1.2;
  score += Math.max(0, candidate.completions || 0) * .45;
  score += Math.max(0, candidate.likes || 0) * 5;
  score -= Math.max(0, candidate.unlikes || 0) * 7;
  score -= Math.max(0, candidate.skips || 0) * 1.4;
  score += candidate.loved ? 6 : 0;
  score += Math.max(0, Number(candidate.rating) || 0) / 20;
  score += Math.max(0, candidate.positiveVotes || 0) * 4;
  score -= Math.max(0, candidate.negativeVotes || 0) * 9;
  score += Math.max(0, candidate.contextPositiveVotes || 0) * 7;
  score -= Math.max(0, candidate.contextNegativeVotes || 0) * 14;
  score += Math.min(2, Math.max(0, candidate.sharedPlaylists || 0)) * 3;
  const eraDistance = yearDistance(candidate.year, anchor?.year);
  if (eraDistance !== null) score += Math.max(0, 6 - eraDistance * .75);
  if (anchor && candidate.artist && candidate.artist.toLocaleLowerCase() === anchor.artist?.toLocaleLowerCase()) score += 3;
  if (anchor && candidate.album && candidate.album.toLocaleLowerCase() === anchor.album?.toLocaleLowerCase()) score += 2;
  if (anchor && sharesGenre(candidate.genre, anchor.genre)) score += 9;
  score -= recentPenalty(candidate.lastPlayedAt, now);
  return score;
}

module.exports = { normalizedWords, sharesGenre, yearDistance, recentPenalty, scoreRadioCandidate };
