const path = require('node:path');
const fs = require('node:fs/promises');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.ogg', '.flac', '.opus']);

function createLibraryService(repository) {
  async function readTrack(filePath) {
    const { parseFile } = await import('music-metadata');
    try {
      const metadata = await parseFile(filePath, { duration: true });
      const picture = metadata.common.picture?.[0];
      return {
        id: filePath,
        path: filePath,
        url: `retro-media://local/${encodeURIComponent(filePath)}`,
        nativePlayback: metadata.format.codec === 'ALAC',
        title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
        artist: metadata.common.artist || 'Unknown artist',
        album: metadata.common.album || 'Unknown album',
        duration: metadata.format.duration || 0,
        cover: picture ? `data:${picture.format};base64,${Buffer.from(picture.data).toString('base64')}` : null
      };
    } catch {
      return {
        id: filePath,
        path: filePath,
        url: `retro-media://local/${encodeURIComponent(filePath)}`,
        nativePlayback: false,
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown artist',
        album: 'Unknown album',
        duration: 0,
        cover: null
      };
    }
  }

  async function indexedTrack(filePath) {
    const stats = await fs.stat(filePath);
    const cached = repository.cachedTrack(filePath);
    if (cached && cached.row.modified_at === stats.mtimeMs && cached.row.file_size === stats.size) return cached.track;
    const track = await readTrack(filePath);
    repository.saveTrack(filePath, stats, track);
    return track;
  }

  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : [];
    }));
    return files.flat();
  }

  async function buildFolderTree(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const children = [];
    let directTrackCount = 0;
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        try {
          const child = await buildFolderTree(fullPath);
          if (child.totalTrackCount > 0) children.push(child);
        } catch {}
      } else if (AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        directTrackCount += 1;
      }
    }
    children.sort((a, b) => a.name.localeCompare(b.name));
    return {
      name: path.basename(directory),
      path: directory,
      directTrackCount,
      totalTrackCount: directTrackCount + children.reduce((sum, child) => sum + child.totalTrackCount, 0),
      children
    };
  }

  async function scan(directory) {
    const files = await walk(directory);
    const tracks = [];
    for (let index = 0; index < files.length; index += 10) {
      tracks.push(...await Promise.all(files.slice(index, index + 10).map(indexedTrack)));
    }
    return { directory, tracks };
  }

  async function index(directory) {
    const library = await scan(directory);
    repository.replaceRootTracks(directory, library.tracks);
    return library;
  }

  return { buildFolderTree, scan, index };
}

module.exports = { createLibraryService, AUDIO_EXTENSIONS };
