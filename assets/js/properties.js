/* Aqua — lettura dei file .properties (data/menu.properties, data/foto.properties)
   chiave = valore (anche chiave: valore), commenti con # o !,
   righe lunghe spezzate con \ a fine riga, sequenze \uXXXX. */
(() => {
  const parse = (text) => {
    const props = new Map();
    const lines = text.replace(/^﻿/, '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/^\s+/, '');
      if (!line || line[0] === '#' || line[0] === '!') continue;
      while (/(^|[^\\])(\\\\)*\\$/.test(line) && i + 1 < lines.length) {
        line = line.slice(0, -1) + lines[++i].replace(/^\s+/, '');
      }
      const m = line.match(/^((?:\\.|[^=:\s\\])+)\s*[=:]?\s*(.*)$/);
      if (!m) continue;
      const unescape = (s) => s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\([tnrf])/g, (_, c) => ({ t: '\t', n: '\n', r: '\r', f: '\f' })[c])
        .replace(/\\(.)/g, '$1');
      props.set(unescape(m[1]), unescape(m[2]).trim());
    }
    return props;
  };

  // scarica un file .properties; ogni file viene letto una volta sola per pagina
  const cache = {};
  const load = (url) => {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: 'no-cache' })
        .then((r) => { if (!r.ok) throw new Error(`${url} ${r.status}`); return r.text(); })
        .then(parse);
    }
    return cache[url];
  };

  window.AquaProps = { parse, load };
})();
