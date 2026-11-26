let tiles = [], edition = '', openFolder = -1, dragIdx = -1, dragFrom = null;
const $ = id => document.getElementById(id);
const letter = t => t.type === 'folder' ? '▣' : ({ Scratch: 'S', Python: 'Py', YouTube: '▶', GitHub: 'GH', Google: 'G' }[t.name] || (t.name[0] || '•').toUpperCase());
function bg(s) { document.body.style.backgroundColor = s.bg; document.body.style.backgroundImage = s.bgImage ? 'url(' + JSON.stringify(s.bgImage) + ')' : 'none'; }
function save() { lz.set('tiles', tiles); render(); }
function mk(t, idx, container) {
  const a = document.createElement('div'); a.className = 'tile' + (t.type === 'folder' ? ' folder' : ''); a.draggable = true;
  const i = document.createElement('i'); i.textContent = letter(t); const s = document.createElement('span'); s.textContent = t.name;
  const x = document.createElement('b'); x.textContent = '×'; x.title = 'حذف';
  a.append(i, s, x);
  x.onclick = e => { e.stopPropagation(); container.splice(idx, 1); save(); };
  a.onclick = () => { if (t.type === 'folder') { openFolder = idx; render(); } else lz.go(t.url); };
  a.ondragstart = e => { dragIdx = idx; dragFrom = container; a.classList.add('drag'); e.dataTransfer.setData('text/plain', 'tile'); };
  a.ondragend = () => a.classList.remove('drag');
  a.ondragover = e => { e.preventDefault(); a.classList.add('over'); };
  a.ondragleave = () => a.classList.remove('over');
  a.ondrop = e => {
    e.preventDefault(); a.classList.remove('over');
    if (dragFrom === null || (dragFrom === container && dragIdx === idx)) return;
    const r = a.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;   // 0 = visual left edge
    const zone = fx > 0.7 ? 'before' : fx < 0.3 ? 'after' : 'middle';            // page is RTL: visual right = earlier
    const moved = dragFrom.splice(dragIdx, 1)[0];
    if (dragFrom === container && dragIdx < idx) idx--;
    const target = container[idx];
    if (zone === 'middle' && container === tiles && moved.type === 'site' && target.type === 'site') {
      container[idx] = { type: 'folder', name: 'Folder', items: [target, moved] };      // middle of site -> new folder
    } else if (zone === 'middle' && container === tiles && target.type === 'folder' && moved.type === 'site') {
      target.items.push(moved);                                                         // middle of folder -> into folder
    } else container.splice(zone === 'after' ? idx + 1 : idx, 0, moved);                // edges (or other) -> reorder
    dragFrom = null; save();
  };
  return a;
}
function render() {
  const box = $('tiles'); box.innerHTML = '';
  tiles.forEach((t, i) => box.appendChild(mk(t, i, tiles)));
  const add = document.createElement('div'); add.className = 'tile'; add.id = 'add'; add.innerHTML = '<i>+</i><span>إضافة</span>';
  add.onclick = () => { $('addrow').style.display = 'flex'; $('addurl').focus(); };
  box.appendChild(add);
  // dropping a tile on empty space of the grid moves it to the end
  box.ondragover = e => e.preventDefault();
  box.ondrop = e => { if (e.target !== box || dragFrom === null) return; tiles.push(dragFrom.splice(dragIdx, 1)[0]); dragFrom = null; save(); };
  const fv = $('folderview');
  if (openFolder >= 0 && tiles[openFolder] && tiles[openFolder].type === 'folder') {
    const f = tiles[openFolder]; fv.style.display = 'flex';
    const nm = $('fname'); if (document.activeElement !== nm) nm.value = f.name;
    const fi = $('fitems'); fi.innerHTML = '';
    f.items.forEach((t, i) => fi.appendChild(mk(t, i, f.items)));
    // drag out of folder: drop on the dim background -> back to main grid
    fv.ondragover = e => e.preventDefault();
    fv.ondrop = e => { if (e.target !== fv || dragFrom !== f.items) return; tiles.push(f.items.splice(dragIdx, 1)[0]); dragFrom = null; if (!f.items.length) { tiles.splice(openFolder, 1); openFolder = -1; } save(); };
  } else { fv.style.display = 'none'; openFolder = -1; }
}
$('fname').oninput = e => { if (tiles[openFolder]) { tiles[openFolder].name = e.target.value.slice(0, 40); lz.set('tiles', tiles); } };
function addTile() {
  const url = $('addurl').value.trim(); if (!url) return;
  const u = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  let name = ''; try { name = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return; }
  tiles.push({ type: 'site', name, url: u }); $('addurl').value = ''; $('addrow').style.display = 'none'; save();
}
$('addok').onclick = addTile; $('addurl').onkeydown = e => { if (e.key === 'Enter') addTile(); };
$('fclose').onclick = () => { openFolder = -1; render(); };
$('q').onkeydown = e => { if (e.key === 'Enter') lz.go($('q').value); };
$('ok').onclick = () => { lz.set('bg', $('c').value); lz.set('bgImage', $('img').value); bg({ bg: $('c').value, bgImage: $('img').value }); };
lz.data().then(d => {
  bg(d.settings); $('c').value = d.settings.bg; $('img').value = d.settings.bgImage; edition = d.edition;
  tiles = d.settings.tiles || d.quick; $('ed').textContent = d.edition; render();
});
