import { createCassetteView } from '../views/cassette-view.js';
import { chooseNextTrackIndex, moveTrack } from '../models/playback-policy.js';
import { createTelemetryController } from './telemetry-controller.js';

const audio = document.querySelector('#audio');
const cassette = document.querySelector('#cassette');
const queue = document.querySelector('#queue');
const els = Object.fromEntries([...document.querySelectorAll('[id]')].map((el) => [el.id, el]));

let tracks = [];
let currentIndex = -1;
let shuffle = false;
let repeat = false;
let nativeState = { playing: false, currentTime: 0, duration: 0 };
const PAGE_SIZE = 50;
let currentPage = 0;
let selectedFolder = null;
let libraryTree = null;
let activeLibraryTab = 'files';
let tapeLibraryTracks = [];
let tapeIndexRoot = null;
let selectedTapeGroup = null;
let tapePlaylists = [];
let selectedPlaylistId = null;
let queuedNextIndex = -1;
let smartFadeEnabled = localStorage.getItem('smartFadeEnabled') !== 'false';
let darkModeEnabled = localStorage.getItem('darkModeEnabled') === 'true';
let draggedTrackIndex = -1;
const expandedFolders = new Set();
let playbackId = null;
let playbackHasStarted = false;
let mixSource = { type: 'unknown', name: null };

const currentTrack = () => tracks[currentIndex];

function playbackPosition() {
  return currentTrack()?.nativePlayback ? nativeState.currentTime : (audio.currentTime || 0);
}

function syncPlaybackSession() {
  window.retroPlayer.savePlaybackSession({
    tracks,
    currentIndex,
    currentPage,
    queuedNextIndex,
    playbackId,
    playbackHasStarted,
    mixSource,
    shuffle,
    repeat
  }).catch(console.error);
}

const recordPlaybackEvent = createTelemetryController(() => ({
  playbackId,
  track: currentTrack(),
  position: playbackPosition(),
  duration: nativeState.duration || audio.duration || 0,
  source: mixSource,
  shuffle,
  repeat,
  smartFade: smartFadeEnabled
}));

function nowPlayingMetadata(track, index) {
  return {
    title: track.title,
    artist: track.artist,
    album: track.album,
    cover: track.cover,
    duration: track.duration,
    queueIndex: index,
    queueCount: tracks.length,
  };
}

function syncPlaybackControls() {
  const disabled = tracks.length === 0;
  [
    els.shuffleButton,
    els.previousButton,
    els.stopButton,
    els.playButton,
    els.nextButton,
    els.repeatButton,
    els.progress,
    els.smartFadeToggle,
  ].forEach((control) => { control.disabled = disabled; });
  document.querySelector('.smart-toggle').classList.toggle('disabled', disabled);
}

function chooseNextIndex() {
  return chooseNextTrackIndex({ trackCount: tracks.length, currentIndex, shuffle });
}

function prepareUpcomingTrack() {
  const current = currentTrack();
  if (!smartFadeEnabled || !current?.nativePlayback || tracks.length < 2) return;
  queuedNextIndex = chooseNextIndex();
  const next = tracks[queuedNextIndex];
  if (next?.nativePlayback) {
    window.retroPlayer.prepareSmartFade(
      { ...current, nowPlaying: nowPlayingMetadata(current, currentIndex) },
      { ...next, nowPlaying: nowPlayingMetadata(next, queuedNextIndex) }
    ).catch(console.error);
  }
}

const { formatTime, updateTapeProgress, applyCoverPalette } = createCassetteView({
  cassette,
  mediaObject: els.mediaObject
});

function paintTrack(track) {
  els.tapeAlbum.textContent = track.album;
  els.tapeTitle.textContent = track.title;
  els.tapeArtist.textContent = track.artist;
  cassette.classList.toggle('has-cover', Boolean(track.cover));
  applyCoverPalette(track.cover);
  els.duration.textContent = formatTime(track.duration);
  updateTapeProgress(0);
  const pageStart = currentPage * PAGE_SIZE;
  [...queue.children].forEach((li, i) => li.classList.toggle('active', pageStart + i === currentIndex));
  document.title = `${track.title} — Side B`;
}

function loadTrack(index, autoplay = true, reason = 'loaded') {
  if (!tracks.length) return;
  cassette.classList.remove('mixing');
  currentIndex = (index + tracks.length) % tracks.length;
  const trackPage = Math.floor(currentIndex / PAGE_SIZE);
  if (trackPage !== currentPage) {
    currentPage = trackPage;
    renderQueue();
  }
  const track = tracks[currentIndex];
  playbackId = crypto.randomUUID();
  playbackHasStarted = autoplay;
  audio.pause();
  if (track.nativePlayback) {
    audio.removeAttribute('src');
    window.retroPlayer.nativeAudioCommand('load', {
      path: track.path,
      metadata: nowPlayingMetadata(track, currentIndex),
    });
  } else {
    audio.src = track.url;
  }
  paintTrack(track);
  recordPlaybackEvent('track_loaded', { reason }, track, { position: 0 });
  if (autoplay) recordPlaybackEvent('play_started', { reason }, track, { position: 0 });
  if (autoplay) {
    if (track.nativePlayback) window.retroPlayer.nativeAudioCommand('play');
    else audio.play().catch((error) => console.error('Could not play the file:', error));
  }
  prepareUpcomingTrack();
  syncPlaybackSession();
}

function clearDropMarkers() {
  queue.querySelectorAll('.dragging, .drop-before, .drop-after').forEach((item) => {
    item.classList.remove('dragging', 'drop-before', 'drop-after');
    item.removeAttribute('aria-grabbed');
  });
}

function reorderTrack(fromIndex, insertionIndex) {
  if (fromIndex < 0 || fromIndex >= tracks.length) return;
  const playingId = currentTrack()?.id;
  tracks = moveTrack(tracks, fromIndex, insertionIndex);
  if (playingId) currentIndex = tracks.findIndex((track) => track.id === playingId);
  queuedNextIndex = -1;
  window.retroPlayer.nativeAudioCommand('cancelNext');
  renderQueue();
  prepareUpcomingTrack();
  syncPlaybackSession();
}

function enableQueueDrag(item, index) {
  item.draggable = true;
  item.dataset.trackIndex = String(index);
  item.addEventListener('dragstart', (event) => {
    if (cassette.classList.contains('mixing')) {
      event.preventDefault();
      return;
    }
    draggedTrackIndex = index;
    item.classList.add('dragging');
    item.setAttribute('aria-grabbed', 'true');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  });
  item.addEventListener('dragover', (event) => {
    if (draggedTrackIndex < 0 || draggedTrackIndex === index) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const after = event.clientY >= item.getBoundingClientRect().top + item.offsetHeight / 2;
    queue.querySelectorAll('.drop-before, .drop-after').forEach((row) => row.classList.remove('drop-before', 'drop-after'));
    item.classList.add(after ? 'drop-after' : 'drop-before');
  });
  item.addEventListener('drop', (event) => {
    if (draggedTrackIndex < 0) return;
    event.preventDefault();
    const after = event.clientY >= item.getBoundingClientRect().top + item.offsetHeight / 2;
    reorderTrack(draggedTrackIndex, index + (after ? 1 : 0));
    draggedTrackIndex = -1;
    clearDropMarkers();
  });
  item.addEventListener('dragend', () => {
    draggedTrackIndex = -1;
    clearDropMarkers();
  });
}

function renderQueue() {
  queue.innerHTML = '';
  const pageCount = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pageCount - 1);
  const pageStart = currentPage * PAGE_SIZE;
  tracks.slice(pageStart, pageStart + PAGE_SIZE).forEach((track, pageIndex) => {
    const index = pageStart + pageIndex;
    const li = document.createElement('li');
    li.title = 'Drag to reorder';
    li.innerHTML = `<span class="num">${String(index + 1).padStart(2, '0')}</span><span><b></b><small></small></span><span class="time">${formatTime(track.duration)}</span>`;
    li.querySelector('b').textContent = track.title;
    li.querySelector('small').textContent = track.artist;
    li.addEventListener('click', () => {
      if (index === currentIndex) return;
      recordPlaybackEvent('skipped', { reason: 'queue_selection', targetIndex: index, playbackStarted: playbackHasStarted });
      recordPlaybackEvent('manual_selection', { targetIndex: index }, track, { position: 0 });
      loadTrack(index, true, 'queue_selection');
    });
    enableQueueDrag(li, index);
    queue.appendChild(li);
  });
  els.emptyState.hidden = Boolean(tracks.length);
  els.trackCount.textContent = `${tracks.length} TRACK${tracks.length === 1 ? '' : 'S'}`;
  els.pagination.hidden = tracks.length <= PAGE_SIZE;
  els.pageLabel.textContent = `${String(currentPage + 1).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
  els.previousPage.disabled = currentPage === 0;
  els.nextPage.disabled = currentPage >= pageCount - 1;
  queue.scrollTop = 0;
  syncPlaybackControls();
}

function applyLibrary(library) {
  tracks = library.tracks;
  currentIndex = -1;
  currentPage = 0;
  els.folderName.textContent = (library.label || library.directory.split('/').pop()).toUpperCase();
  mixSource = { type: library.sourceType || 'folder', name: library.label || library.directory };
  recordPlaybackEvent('mix_tape_loaded', { trackCount: tracks.length, directory: library.directory }, null, { position: 0, duration: 0 });
  renderQueue();
  if (tracks.length) loadTrack(0, false);
  else syncPlaybackSession();
}

function restorePlaybackSession(session) {
  if (!session?.tracks?.length) return false;
  tracks = session.tracks;
  currentIndex = Math.max(0, Math.min(tracks.length - 1, Number(session.currentIndex) || 0));
  currentPage = Math.max(0, Number(session.currentPage) || Math.floor(currentIndex / PAGE_SIZE));
  queuedNextIndex = Number.isInteger(session.queuedNextIndex) ? session.queuedNextIndex : -1;
  playbackId = session.playbackId || crypto.randomUUID();
  playbackHasStarted = Boolean(session.playbackHasStarted);
  mixSource = session.mixSource || { type: 'unknown', name: null };
  shuffle = Boolean(session.shuffle);
  repeat = Boolean(session.repeat);
  els.shuffleButton.classList.toggle('active', shuffle);
  els.repeatButton.classList.toggle('active', repeat);
  els.folderName.textContent = String(mixSource.name || 'MIX-TAPE').toUpperCase();
  renderQueue();
  paintTrack(currentTrack());
  if (session.nativeState?.event === 'state') {
    nativeState = session.nativeState;
    cassette.classList.toggle('playing', nativeState.playing);
    els.playButton.textContent = nativeState.playing ? '❚❚' : '▶';
    els.currentTime.textContent = formatTime(nativeState.currentTime);
    els.duration.textContent = formatTime(nativeState.duration);
    els.progress.value = nativeState.duration ? nativeState.currentTime / nativeState.duration * 100 : 0;
    updateTapeProgress(nativeState.duration ? nativeState.currentTime / nativeState.duration : 0);
  }
  return true;
}

function selectFolder(folderPath) {
  selectedFolder = folderPath;
  if (activeLibraryTab === 'files') els.loadFolderButton.disabled = false;
  document.querySelectorAll('.folder-row').forEach((row) => {
    row.classList.toggle('selected', row.dataset.path === folderPath);
  });
}

function createFolderNode(folder, depth = 0) {
  const node = document.createElement('div');
  node.className = 'folder-node';
  const row = document.createElement('div');
  row.className = 'folder-row';
  row.dataset.path = folder.path;
  row.style.setProperty('--depth', depth);

  const toggle = document.createElement('button');
  toggle.className = 'folder-toggle';
  toggle.disabled = folder.children.length === 0;
  toggle.textContent = expandedFolders.has(folder.path) ? '▾' : '▸';
  const name = document.createElement('span');
  name.className = 'folder-name';
  name.textContent = folder.name;
  const count = document.createElement('span');
  count.className = 'folder-count';
  count.textContent = folder.totalTrackCount;
  row.append(toggle, name, count);
  row.addEventListener('click', () => selectFolder(folder.path));

  const children = document.createElement('div');
  children.className = 'folder-children';
  children.hidden = !expandedFolders.has(folder.path);
  folder.children.forEach((child) => children.appendChild(createFolderNode(child, depth + 1)));
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const expanded = expandedFolders.has(folder.path);
    if (expanded) expandedFolders.delete(folder.path); else expandedFolders.add(folder.path);
    children.hidden = expanded;
    toggle.textContent = expanded ? '▸' : '▾';
  });
  node.append(row, children);
  return node;
}

function applyLibraryTree(library, indexedTracks = null) {
  libraryTree = library.tree;
  tapeLibraryTracks = indexedTracks || [];
  tapeIndexRoot = indexedTracks ? library.directory : null;
  selectedTapeGroup = null;
  localStorage.setItem('mediaLibraryRoot', library.directory);
  expandedFolders.clear();
  expandedFolders.add(library.tree.path);
  els.folderTree.innerHTML = '';
  els.folderTree.appendChild(createFolderNode(library.tree));
  els.libraryHint.textContent = `${library.tree.totalTrackCount} song${library.tree.totalTrackCount === 1 ? '' : 's'} found`;
  els.scanLibraryButton.disabled = false;
  selectFolder(library.tree.path);
  if (activeLibraryTab === 'tapes') indexedTracks ? renderTapesTree() : loadTapeIndex();
}

function selectTapeGroup(label, groupTracks, row, playlistId = null) {
  selectedTapeGroup = { label, tracks: groupTracks, sourceType: playlistId ? 'playlist' : 'tapes' };
  selectedPlaylistId = playlistId;
  els.deletePlaylistButton.disabled = !playlistId;
  els.tapesTree.querySelectorAll('.tape-row.selected').forEach((item) => item.classList.remove('selected'));
  row.classList.add('selected');
  els.loadFolderButton.disabled = groupTracks.length === 0;
}

function createPlaylistRow(playlist) {
  const row = createTapeSelectionRow(playlist.name, [], 'PLAYLIST', async (selectedRow) => {
    selectedRow.classList.add('loading');
    const playlistTracks = await window.retroPlayer.loadPlaylistTracks(playlist.id);
    selectedRow.classList.remove('loading');
    selectTapeGroup(playlist.name, playlistTracks, selectedRow, playlist.id);
  });
  row.querySelector('.folder-count').textContent = playlist.trackCount;
  return row;
}

function createPlaylistsCategory(playlists) {
  const section = createTapeCategory('Playlists', []);
  const header = section.querySelector(':scope > .tape-row');
  const children = section.querySelector('.tape-group');
  header.querySelector('.folder-count').textContent = playlists.length;
  playlists.forEach((playlist) => children.appendChild(createPlaylistRow(playlist)));
  return section;
}

async function loadPlaylists() {
  tapePlaylists = await window.retroPlayer.listPlaylists();
  if (activeLibraryTab === 'tapes' && tapeLibraryTracks.length) renderTapesTree();
}

function createTapeSelectionRow(label, groupTracks, detail = '', selectionHandler = null) {
  const row = document.createElement('div');
  row.className = 'tape-row child';
  const marker = document.createElement('span');
  marker.textContent = '›';
  const name = document.createElement('span');
  name.className = 'folder-name';
  name.textContent = label;
  if (detail) {
    const small = document.createElement('small');
    small.textContent = detail;
    name.appendChild(small);
  }
  const count = document.createElement('span');
  count.className = 'folder-count';
  count.textContent = groupTracks.length;
  row.append(marker, name, count);
  row.addEventListener('click', () => selectionHandler
    ? selectionHandler(row)
    : selectTapeGroup(label, groupTracks, row));
  return row;
}

function createTapeCategory(label, groups) {
  const section = document.createElement('section');
  section.className = 'tape-category';
  const header = document.createElement('div');
  header.className = 'tape-row';
  const toggle = document.createElement('button');
  toggle.className = 'folder-toggle';
  toggle.textContent = '▸';
  const name = document.createElement('span');
  name.className = 'folder-name';
  name.textContent = label;
  const count = document.createElement('span');
  count.className = 'folder-count';
  count.textContent = groups.length;
  const children = document.createElement('div');
  children.className = 'tape-group';
  children.hidden = true;
  groups.forEach((group) => children.appendChild(createTapeSelectionRow(group.label, group.tracks, group.detail)));
  const toggleGroup = () => {
    children.hidden = !children.hidden;
    toggle.textContent = children.hidden ? '▸' : '▾';
  };
  header.addEventListener('click', toggleGroup);
  toggle.addEventListener('click', (event) => { event.stopPropagation(); toggleGroup(); });
  header.append(toggle, name, count);
  section.append(header, children);
  return section;
}

function groupedTracks(keyForTrack, labelForGroup, detailForGroup = () => '') {
  const groups = new Map();
  tapeLibraryTracks.forEach((track) => {
    const key = keyForTrack(track);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(track);
  });
  return [...groups.entries()].map(([key, groupTracks]) => ({
    label: labelForGroup(groupTracks[0], key),
    detail: detailForGroup(groupTracks[0], key),
    tracks: groupTracks.slice().sort((a, b) => a.title.localeCompare(b.title)),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

function renderTapesTree() {
  els.tapesTree.innerHTML = '';
  const allSongs = tapeLibraryTracks.slice().sort((a, b) => a.title.localeCompare(b.title));
  const songsRow = createTapeSelectionRow('Songs', allSongs);
  songsRow.classList.remove('child');
  songsRow.firstChild.textContent = '•';
  const artists = groupedTracks((track) => track.artist, (track) => track.artist);
  const albums = groupedTracks(
    (track) => `${track.album}\u0000${track.artist}`,
    (track) => track.album,
    (track) => track.artist
  );
  els.tapesTree.append(
    songsRow,
    createTapeCategory('Artists', artists),
    createTapeCategory('Albums', albums),
    createPlaylistsCategory(tapePlaylists)
  );
  selectTapeGroup('Songs', allSongs, songsRow);
}

function renderTapeSearch(query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) { renderTapesTree(); return; }
  els.tapesTree.innerHTML = '';
  const artists = groupedTracks((track) => track.artist, (track) => track.artist)
    .filter((group) => group.label.toLocaleLowerCase().includes(normalized));
  const albums = groupedTracks(
    (track) => `${track.album}\u0000${track.artist}`,
    (track) => track.album,
    (track) => track.artist
  ).filter((group) => `${group.label} ${group.detail}`.toLocaleLowerCase().includes(normalized));
  const songs = tapeLibraryTracks.filter((track) =>
    `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase().includes(normalized)
  );
  const playlists = tapePlaylists.filter((playlist) => playlist.name.toLocaleLowerCase().includes(normalized));
  const results = [
    ...artists.map((group) => ({ ...group, detail: `ARTIST · ${group.tracks.length} TRACKS` })),
    ...albums.map((group) => ({ ...group, detail: `ALBUM · ${group.detail}` })),
    ...songs.map((track) => ({ label: track.title, detail: `SONG · ${track.artist}`, tracks: [track] })),
  ].slice(0, 100);
  if (!results.length && !playlists.length) {
    els.tapesTree.innerHTML = '<p class="tapes-loading">NO MATCHING TAPES</p>';
    return;
  }
  playlists.forEach((playlist) => els.tapesTree.appendChild(createPlaylistRow(playlist)));
  results.forEach((result) => els.tapesTree.appendChild(createTapeSelectionRow(result.label, result.tracks, result.detail)));
}

function filterFiles(query) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) {
    els.folderTree.innerHTML = '';
    if (libraryTree) els.folderTree.appendChild(createFolderNode(libraryTree));
    return;
  }
  const visit = (node) => {
    const row = node.querySelector(':scope > .folder-row');
    const children = node.querySelector(':scope > .folder-children');
    const ownMatch = row?.querySelector('.folder-name')?.textContent.toLocaleLowerCase().includes(normalized);
    let childMatch = false;
    children?.querySelectorAll(':scope > .folder-node').forEach((child) => { if (visit(child)) childMatch = true; });
    node.hidden = !ownMatch && !childMatch;
    if (children && childMatch) children.hidden = false;
    return !node.hidden;
  };
  els.folderTree.querySelectorAll(':scope > .folder-node').forEach(visit);
}

async function loadTapeIndex() {
  if (!libraryTree) {
    els.tapesTree.innerHTML = '<p class="tapes-loading">SELECT A MEDIA LIBRARY FIRST</p>';
    els.loadFolderButton.disabled = true;
    return;
  }
  if (tapeIndexRoot === libraryTree.path && tapeLibraryTracks.length) {
    renderTapesTree();
    return;
  }
  els.tapesTree.innerHTML = '<p class="tapes-loading">INDEXING TAPES…</p>';
  els.loadFolderButton.disabled = true;
  let library = await window.retroPlayer.loadIndexedLibrary(libraryTree.path);
  if (!library) {
    const refreshed = await window.retroPlayer.rescanLibrary();
    if (refreshed) {
      applyLibraryTree(refreshed, refreshed.tracks);
      return;
    }
  }
  if (!library || activeLibraryTab !== 'tapes') return;
  tapeLibraryTracks = library.tracks;
  tapeIndexRoot = libraryTree.path;
  renderTapesTree();
}

function switchLibraryTab(tab) {
  activeLibraryTab = tab;
  const showFiles = tab === 'files';
  els.filesTab.classList.toggle('active', showFiles);
  els.tapesTab.classList.toggle('active', !showFiles);
  els.filesTab.setAttribute('aria-selected', String(showFiles));
  els.tapesTab.setAttribute('aria-selected', String(!showFiles));
  els.folderTree.hidden = !showFiles;
  els.tapesTree.hidden = showFiles;
  els.librarySearch.value = '';
  els.librarySearch.placeholder = showFiles ? 'Search files…' : 'Search tapes…';
  els.loadFolderButton.disabled = showFiles ? !selectedFolder : !selectedTapeGroup;
  if (showFiles && libraryTree) {
    els.folderTree.innerHTML = '';
    els.folderTree.appendChild(createFolderNode(libraryTree));
  }
  if (!showFiles) loadTapeIndex();
}

els.previousPage.addEventListener('click', () => {
  if (currentPage > 0) { currentPage -= 1; renderQueue(); syncPlaybackSession(); }
});
els.nextPage.addEventListener('click', () => {
  if ((currentPage + 1) * PAGE_SIZE < tracks.length) { currentPage += 1; renderQueue(); syncPlaybackSession(); }
});
els.filesTab.addEventListener('click', () => switchLibraryTab('files'));
els.tapesTab.addEventListener('click', () => switchLibraryTab('tapes'));
els.librarySearch.addEventListener('input', () => {
  if (activeLibraryTab === 'files') filterFiles(els.librarySearch.value);
  else if (tapeLibraryTracks.length) renderTapeSearch(els.librarySearch.value);
});
els.scanLibraryButton.addEventListener('click', async () => {
  els.scanLibraryButton.disabled = true;
  els.scanLibraryButton.textContent = 'SCANNING…';
  try {
    const refreshed = await window.retroPlayer.rescanLibrary();
    if (refreshed) applyLibraryTree(refreshed, refreshed.tracks);
  } finally {
    els.scanLibraryButton.textContent = '↻ SCAN';
    els.scanLibraryButton.disabled = !libraryTree;
  }
});

els.addPlaylistButton.addEventListener('click', async () => {
  els.addPlaylistButton.disabled = true;
  els.addPlaylistButton.textContent = 'IMPORTING…';
  try {
    const result = await window.retroPlayer.importAppleMusicPlaylists();
    if (!result) return;
    if (result.error) {
      els.libraryHint.textContent = `Import failed: ${result.error}`;
      return;
    }
    await loadPlaylists();
    switchLibraryTab('tapes');
    const matched = result.playlists.reduce((sum, playlist) => sum + playlist.matched, 0);
    const total = result.playlists.reduce((sum, playlist) => sum + playlist.total, 0);
    els.libraryHint.textContent = `${result.imported} playlists imported · ${matched}/${total} local tracks matched`;
  } finally {
    els.addPlaylistButton.disabled = false;
    els.addPlaylistButton.textContent = '⇩ IMPORT';
  }
});

els.deletePlaylistButton.addEventListener('click', async () => {
  if (!selectedPlaylistId || !selectedTapeGroup) return;
  if (!window.confirm(`Delete “${selectedTapeGroup.label}” from Side B?`)) return;
  if (await window.retroPlayer.deletePlaylist(selectedPlaylistId)) {
    selectedPlaylistId = null;
    selectedTapeGroup = null;
    els.deletePlaylistButton.disabled = true;
    await loadPlaylists();
  }
});

els.libraryButton.addEventListener('click', async () => {
  els.libraryButton.disabled = true;
  els.libraryButton.textContent = 'READING TAPES…';
  try {
    const library = await window.retroPlayer.chooseLibrary();
    if (!library) return;
    applyLibraryTree(library);
  } finally {
    els.libraryButton.disabled = false;
    els.libraryButton.innerHTML = '<span>＋</span> SELECT MEDIA LIBRARY';
  }
});

els.loadFolderButton.addEventListener('click', async () => {
  if (activeLibraryTab === 'tapes') {
    if (!selectedTapeGroup) return;
    applyLibrary({ directory: libraryTree.path, label: selectedTapeGroup.label, sourceType: selectedTapeGroup.sourceType, tracks: selectedTapeGroup.tracks.slice() });
    return;
  }
  if (!selectedFolder) return;
  els.loadFolderButton.disabled = true;
  els.loadFolderButton.firstChild.textContent = 'LOADING… ';
  try {
    const library = await window.retroPlayer.loadFolder(selectedFolder);
    if (library) applyLibrary({ ...library, sourceType: 'folder' });
  } finally {
    els.loadFolderButton.disabled = false;
    els.loadFolderButton.firstChild.textContent = 'LOAD INTO MIX-TAPE ';
  }
});

els.playButton.addEventListener('click', () => {
  if (currentIndex < 0 && tracks.length) loadTrack(0);
  else if (currentTrack()?.nativePlayback) {
    const willPause = nativeState.playing;
    window.retroPlayer.nativeAudioCommand(willPause ? 'pause' : 'play');
    recordPlaybackEvent(willPause ? 'paused' : (playbackHasStarted ? 'resumed' : 'play_started'), { reason: 'transport' });
    if (!willPause) playbackHasStarted = true;
  } else if (audio.paused) {
    recordPlaybackEvent(playbackHasStarted ? 'resumed' : 'play_started', { reason: 'transport' });
    playbackHasStarted = true;
    audio.play().catch((error) => console.error('Could not play the file:', error));
  } else {
    recordPlaybackEvent('paused', { reason: 'transport' });
    audio.pause();
  }
});
els.stopButton.addEventListener('click', () => {
  recordPlaybackEvent('stopped', { reason: 'transport' });
  cassette.classList.remove('mixing');
  if (currentTrack()?.nativePlayback) window.retroPlayer.nativeAudioCommand('stop');
  audio.pause();
  audio.currentTime = 0;
  els.currentTime.textContent = '0:00';
  els.progress.value = 0;
  updateTapeProgress(0);
});
els.previousButton.addEventListener('click', () => {
  recordPlaybackEvent('skipped', { reason: 'previous', playbackStarted: playbackHasStarted });
  loadTrack(currentIndex - 1, true, 'previous');
});
els.nextButton.addEventListener('click', () => {
  recordPlaybackEvent('skipped', { reason: 'next', playbackStarted: playbackHasStarted });
  loadTrack(shuffle ? Math.floor(Math.random() * tracks.length) : currentIndex + 1, true, 'next');
});
els.shuffleButton.addEventListener('click', () => {
  shuffle = !shuffle;
  els.shuffleButton.classList.toggle('active', shuffle);
  recordPlaybackEvent('shuffle_changed', { enabled: shuffle });
  syncPlaybackSession();
});
els.repeatButton.addEventListener('click', () => {
  repeat = !repeat;
  els.repeatButton.classList.toggle('active', repeat);
  recordPlaybackEvent('repeat_changed', { enabled: repeat });
  syncPlaybackSession();
});
els.volume.addEventListener('input', async () => {
  await window.retroPlayer.setSystemVolume(Number(els.volume.value));
});
els.smartFadeToggle.checked = smartFadeEnabled;
els.darkModeToggle.checked = darkModeEnabled;
document.body.classList.toggle('dark', darkModeEnabled);
syncPlaybackControls();
els.smartFadeToggle.addEventListener('change', () => {
  smartFadeEnabled = els.smartFadeToggle.checked;
  recordPlaybackEvent('smart_fade_changed', { enabled: smartFadeEnabled });
  localStorage.setItem('smartFadeEnabled', String(smartFadeEnabled));
  if (smartFadeEnabled) prepareUpcomingTrack();
  else {
    cassette.classList.remove('mixing');
    window.retroPlayer.nativeAudioCommand('cancelNext');
  }
});
els.darkModeToggle.addEventListener('change', () => {
  darkModeEnabled = els.darkModeToggle.checked;
  document.body.classList.toggle('dark', darkModeEnabled);
  localStorage.setItem('darkModeEnabled', String(darkModeEnabled));
});
els.progress.addEventListener('input', () => {
  if (currentTrack()?.nativePlayback && nativeState.duration) {
    window.retroPlayer.nativeAudioCommand('seek', { time: nativeState.duration * Number(els.progress.value) / 100 });
  } else if (audio.duration) audio.currentTime = audio.duration * Number(els.progress.value) / 100;
});
els.progress.addEventListener('change', () => recordPlaybackEvent('seeked', { percent: Number(els.progress.value) }));
audio.addEventListener('play', () => { cassette.classList.add('playing'); els.playButton.textContent = '❚❚'; });
audio.addEventListener('pause', () => { cassette.classList.remove('playing'); els.playButton.textContent = '▶'; });
audio.addEventListener('timeupdate', () => {
  const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
  els.currentTime.textContent = formatTime(audio.currentTime);
  els.progress.value = ratio * 100;
  updateTapeProgress(ratio);
});
audio.addEventListener('loadedmetadata', () => { els.duration.textContent = formatTime(audio.duration); });
audio.addEventListener('ended', () => {
  recordPlaybackEvent('play_completed');
  if (repeat) {
    recordPlaybackEvent('repeat_started');
    audio.currentTime = 0;
    audio.play();
  } else {
    const nextIndex = chooseNextIndex();
    recordPlaybackEvent('auto_advanced', { targetIndex: nextIndex });
    loadTrack(nextIndex, true, 'auto_advance');
  }
});

els.pinButton.addEventListener('click', async () => {
  const value = els.pinButton.getAttribute('aria-pressed') !== 'true';
  const actual = await window.retroPlayer.setAlwaysOnTop(value);
  els.pinButton.setAttribute('aria-pressed', String(actual));
});
els.awakeButton.addEventListener('click', async () => {
  const enabled = els.awakeButton.getAttribute('aria-pressed') !== 'true';
  const actual = await window.retroPlayer.setKeepAwake(enabled);
  els.awakeButton.setAttribute('aria-pressed', String(actual));
});
els.compactButton.addEventListener('click', async () => {
  const compact = !document.body.classList.contains('compact');
  document.body.classList.toggle('compact', compact);
  els.compactButton.setAttribute('aria-pressed', String(compact));
  await window.retroPlayer.setCompact(compact);
});
audio.volume = 1;

async function syncSystemVolume() {
  const volume = await window.retroPlayer.getSystemVolume().catch(() => null);
  if (volume === null) return;
  els.volume.value = volume;
}
syncSystemVolume();
setInterval(syncSystemVolume, 1000);

window.retroPlayer.onNativeAudioState((state) => {
  if (state.event === 'error') return console.error('Motor de audio:', state.message);
  if (state.event === 'remoteCommand') {
    if (state.command === 'next') els.nextButton.click();
    else if (state.command === 'previous') els.previousButton.click();
    else if (state.command === 'togglePlayPause') els.playButton.click();
    else if (state.command === 'play' && !nativeState.playing) els.playButton.click();
    else if (state.command === 'pause' && nativeState.playing) els.playButton.click();
    else if (state.command === 'seek' && Number.isFinite(state.time)) {
      window.retroPlayer.nativeAudioCommand('seek', { time: state.time });
    }
    return;
  }
  if (state.event === 'crossfadeStarted') {
    cassette.classList.add('mixing');
    recordPlaybackEvent('crossfade_started', { targetIndex: queuedNextIndex });
    return;
  }
  if (state.event === 'transitioned') {
    const outgoingTrack = currentTrack();
    recordPlaybackEvent('play_completed', { via: 'smart_fade' }, outgoingTrack);
    recordPlaybackEvent('crossfade_completed', { targetIndex: queuedNextIndex }, outgoingTrack);
    cassette.classList.remove('mixing');
    currentIndex = queuedNextIndex;
    playbackId = crypto.randomUUID();
    playbackHasStarted = true;
    const trackPage = Math.floor(currentIndex / PAGE_SIZE);
    if (trackPage !== currentPage) { currentPage = trackPage; renderQueue(); }
    paintTrack(currentTrack());
    recordPlaybackEvent('auto_advanced', { via: 'smart_fade', targetIndex: currentIndex }, currentTrack(), { position: 0 });
    recordPlaybackEvent('play_started', { reason: 'smart_fade' }, currentTrack(), { position: 0 });
    prepareUpcomingTrack();
    syncPlaybackSession();
    return;
  }
  if (state.event === 'prepared') return;
  if (state.event === 'ended') {
    recordPlaybackEvent('play_completed');
    if (repeat) {
      recordPlaybackEvent('repeat_started');
      window.retroPlayer.nativeAudioCommand('seek', { time: 0 });
      window.retroPlayer.nativeAudioCommand('play');
    } else {
      const nextIndex = queuedNextIndex >= 0 ? queuedNextIndex : chooseNextIndex();
      recordPlaybackEvent('auto_advanced', { targetIndex: nextIndex });
      loadTrack(nextIndex, true, 'auto_advance');
    }
    return;
  }
  nativeState = state;
  cassette.classList.toggle('playing', state.playing);
  els.playButton.textContent = state.playing ? '❚❚' : '▶';
  els.currentTime.textContent = formatTime(state.currentTime);
  els.duration.textContent = formatTime(state.duration);
  els.progress.value = state.duration ? state.currentTime / state.duration * 100 : 0;
  updateTapeProgress(state.duration ? state.currentTime / state.duration : 0);
});

async function bootstrap() {
  const [library, session, keepAwake] = await Promise.all([
    window.retroPlayer.loadSavedLibrary(),
    window.retroPlayer.restorePlaybackSession(),
    window.retroPlayer.getKeepAwake()
  ]);
  els.awakeButton.setAttribute('aria-pressed', String(keepAwake));
  if (library) applyLibraryTree(library);
  else {
    const legacyRoot = localStorage.getItem('mediaLibraryRoot') || localStorage.getItem('lastFolder');
    if (legacyRoot) {
      const legacyLibrary = await window.retroPlayer.loadLibraryTree(legacyRoot);
      if (legacyLibrary) applyLibraryTree(legacyLibrary);
    }
  }
  await loadPlaylists();
  restorePlaybackSession(session);
}

bootstrap().catch(console.error);
