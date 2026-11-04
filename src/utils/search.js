// Spelling-tolerant name matching.
//
// Many item names are Indian, Japanese, Chinese or Korean words written in
// English letters, and there is no single agreed spelling: jeera/jira,
// moong/mung, shoyu/shouyu, kimchi/gimchi, bok choy/pak choi. English
// sound-alike algorithms (Soundex, Metaphone) assume English pronunciation,
// so instead we collapse the spelling differences these romanizations
// actually show, then allow a one-letter slip on top for whatever the rules
// miss.

// Reduces one word to a spelling-neutral key, e.g. "jeera" and "jira" both
// become "jir", "channa" and "chana" both become "cn".
export function wordKey(word) {
  let w = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // drop accents
    .replace(/[^a-z]/g, '')
  if (!w) return ''
  w = w
    .replace(/[tc]ch/g, 'ch') // matcha/maccha
    .replace(/c(?!h)/g, 'k') // hard c: daikon/daicon
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/z/g, 'j')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/sh/g, 's')
    .replace(/chh?/g, 'c')
    .replace(/([bcdgjkpt])h/g, '$1') // aspirates: dh, bh, kh, gh, th ...
    // Romanizations of Korean and Chinese disagree on whether a word's
    // first consonant is voiced: gimchi/kimchi, bulgogi/pulgogi,
    // doufu/tofu, bok/pak. Only the first letter, since doing it everywhere
    // starts pairing English words (bread/broth, mint/bhindi).
    .replace(/^([gbd])\1*/, (m) => ({ g: 'k', b: 'p', d: 't' })[m[0]].repeat(m.length))
    .replace(/eo/g, 'o') // Korean: tteok/ttok
    .replace(/ae/g, 'e') // Korean: japchae/japche
    .replace(/iy(?=[aeiou])/g, 'i') // dhaniya/dhania
    .replace(/ee|ii|y(?=[^aeiou]|$)/g, 'i')
    .replace(/ou/g, 'o') // Japanese long o: shouyu/shoyu
    .replace(/oo|uu/g, 'u')
    .replace(/(.)\1+/g, '$1') // doubled letters: aa, nn, dd ...
    .replace(/(?<=.)[aeiou]$/, '') // final vowel: poha/pohe, methi/meth
    .replace(/(?<=.)a/g, '') // short "a", often dropped or written as u
  return w
}

function words(text) {
  return text.toLowerCase().split(/[^a-zÀ-ɏ]+/).filter(Boolean)
}

// Edit distance (insert, delete, substitute, swap neighbours), giving up
// once it exceeds max.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prevPrev = null
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, prevPrev[j - 2] + 1)
      }
      row.push(d)
      rowMin = Math.min(rowMin, d)
    }
    if (rowMin > max) return max + 1
    prevPrev = prev
    prev = row
  }
  return prev[b.length]
}

// Keys are short ("cn" for chana), so a one-letter slip is only allowed
// once there's enough of a key for it not to match everything.
function keysClose(a, b, minLength = 3) {
  return Math.min(a.length, b.length) >= minLength && editDistance(a, b, 1) <= 1
}

// How well `query` matches `name`: 0 exact, 1 plain substring, 2 every
// query word sounds like the start of a word in the name, 3 every query
// word is one slip away from a word in the name. null for no match.
// Lower is better.
export function matchRank(query, name) {
  const q = query.trim().toLowerCase()
  const n = name.toLowerCase()
  if (!q) return null
  if (n === q) return 0
  if (n.includes(q)) return 1
  // Below three letters there's too little to go on; "ch" would match
  // every word with a c in it.
  if (q.replace(/[^a-z]/g, '').length < 3) return null

  const qKeys = words(q).map(wordKey).filter(Boolean)
  const nKeys = words(n).map(wordKey).filter(Boolean)
  if (!qKeys.length || !nKeys.length) return null
  // A one-letter key ("chee" and "chai" both reduce to "c") says too
  // little to match on by itself, and only counts as an exact match next
  // to longer words ("kai lan").
  if (qKeys.every((k) => k.length < 2)) return null

  // the last query word may still be mid-typing, so it matches as a prefix
  const last = qKeys.length - 1
  const sounds = qKeys.every((k, i) =>
    nKeys.some((nk) => (i === last && k.length >= 2 ? nk.startsWith(k) : nk === k)),
  )
  if (sounds) return 2
  if (qKeys.every((k) => nKeys.some((nk) => nk === k || keysClose(k, nk)))) return 3
  return null
}

// Options whose name matches the query, best matches first, then A–Z.
export function searchByName(options, query) {
  return options
    .map((option) => ({ option, rank: matchRank(query, option.name) }))
    .filter((m) => m.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.option.name.localeCompare(b.option.name))
    .map((m) => m.option)
}

function nameKey(name) {
  return words(name).map(wordKey).filter(Boolean).join(' ')
}

// Existing items that are probably the same thing as `name` spelled
// differently, for a "did you mean" prompt. Compares whole names, not
// prefixes, so "dal" doesn't suggest every kind of dal. Exact
// (case-insensitive) matches are left out; the caller already handles those.
export function similarItems(items, name) {
  const trimmed = name.trim().toLowerCase()
  const key = nameKey(trimmed)
  if (key.replace(/ /g, '').length < 2) return []
  return items.filter((item) => {
    if (item.name.toLowerCase() === trimmed) return false
    const other = nameKey(item.name)
    // stricter than search: a wrong guess here interrupts adding an item
    return other === key || keysClose(other, key, 4)
  })
}
