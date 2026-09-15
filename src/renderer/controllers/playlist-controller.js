export function createPlaylistController({ api, getLibraryTracks, onSaved, onError }) {
  let opening = false;
  return {
    async open({ playlist = null, tracks = [], name = '' } = {}) {
      if (opening) return;
      opening = true;
      let dialog;
      try {
        const library = await getLibraryTracks();
        let draft = tracks.slice();
        dialog = document.createElement('dialog');
        dialog.className = 'playlist-editor';
        dialog.setAttribute('aria-labelledby', 'playlistEditorTitle');
        dialog.innerHTML = `<form>
          <h2 id="playlistEditorTitle"></h2>
          <label>PLAYLIST NAME<input name="playlistName" maxlength="120" required autocomplete="off" /></label>
          <div class="playlist-columns">
            <section aria-label="Playlist tracks"><h3>YOUR PLAYLIST <span class="draft-count"></span></h3><ol class="draft-tracks"></ol></section>
            <section aria-label="Add library songs"><h3>ADD FROM LIBRARY</h3><input class="song-search" type="search" aria-label="Search library songs" placeholder="Song, artist or album…" /><p class="search-summary"></p><ul class="library-songs"></ul></section>
          </div>
          <p class="editor-error" role="alert"></p>
          <div class="editor-actions"><button type="button" class="cancel">CANCEL</button><button type="submit" class="save">SAVE PLAYLIST</button></div>
        </form>`;
        const form = dialog.querySelector('form');
        const nameInput = form.elements.playlistName;
        nameInput.value = playlist?.name || name;
        dialog.querySelector('h2').textContent = playlist ? 'Edit playlist' : 'New playlist';
        const errorLabel = dialog.querySelector('.editor-error');
        const draftList = dialog.querySelector('.draft-tracks');
        const libraryList = dialog.querySelector('.library-songs');
        const search = dialog.querySelector('.song-search');
        let saving = false;
        function button(label, title, action, disabled = false) {
          const element = document.createElement('button');
          element.type = 'button';
          element.textContent = label;
          element.title = title;
          element.setAttribute('aria-label', title);
          element.disabled = disabled;
          element.addEventListener('click', action);
          return element;
        }
        function songLabel(track) {
          const label = document.createElement('span');
          const title = document.createElement('b');
          const detail = document.createElement('small');
          title.textContent = track.title;
          detail.textContent = `${track.artist} · ${track.album}`;
          label.append(title, detail);
          return label;
        }
        function renderDraft(focusIndex = null) {
          draftList.replaceChildren();
          dialog.querySelector('.draft-count').textContent = `(${draft.length})`;
          draft.forEach((track, index) => {
            const row = document.createElement('li');
            const actions = document.createElement('div');
            function move(offset) {
              [draft[index], draft[index + offset]] = [draft[index + offset], draft[index]];
              renderDraft(index + offset);
            }
            actions.append(
              button('↑', `Move ${track.title} up`, () => move(-1), index === 0),
              button('↓', `Move ${track.title} down`, () => move(1), index === draft.length - 1),
              button('×', `Remove ${track.title}`, () => { draft.splice(index, 1); renderDraft(Math.min(index, draft.length - 1)); })
            );
            row.append(songLabel(track), actions);
            draftList.append(row);
          });
          if (!draft.length) draftList.textContent = 'Add songs from your library. You can also save an empty playlist.';
          if (focusIndex !== null) draftList.children[focusIndex]?.querySelector('button:not(:disabled)')?.focus();
        }
        function renderLibrary() {
          const query = search.value.trim().toLocaleLowerCase();
          const matches = library.filter((track) => `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase().includes(query));
          libraryList.replaceChildren();
          dialog.querySelector('.search-summary').textContent = matches.length > 100
            ? `Showing 100 of ${matches.length} songs. Search to narrow the list.` : `${matches.length} songs`;
          matches.slice(0, 100).forEach((track) => {
            const row = document.createElement('li');
            row.append(songLabel(track), button('+', `Add ${track.title}`, () => { draft.push(track); renderDraft(); }));
            libraryList.append(row);
          });
        }
        search.addEventListener('input', renderLibrary);
        dialog.querySelector('.cancel').addEventListener('click', () => dialog.close());
        dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
        dialog.addEventListener('close', () => { dialog.remove(); opening = false; });
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          if (saving) return;
          if (!nameInput.value.trim()) { errorLabel.textContent = 'Enter a playlist name.'; nameInput.focus(); return; }
          saving = true;
          form.querySelectorAll('button, input').forEach((element) => { element.disabled = true; });
          try {
            const result = await api.savePlaylist({ id: playlist?.id ?? null, name: nameInput.value.trim(), paths: draft.map((track) => track.path) });
            if (result.error) throw new Error(result.error);
            dialog.close();
            await onSaved(result.playlist);
          } catch (error) {
            if (dialog.open) {
              errorLabel.textContent = error.message;
              form.querySelectorAll('button, input').forEach((element) => { element.disabled = false; });
              renderDraft();
            } else onError(error);
          } finally { saving = false; }
        });
        document.body.append(dialog);
        renderDraft();
        renderLibrary();
        dialog.showModal();
        nameInput.focus();
      } catch (error) {
        dialog?.remove();
        opening = false;
        onError(error);
      }
    }
  };
}
