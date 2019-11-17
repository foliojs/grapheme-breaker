const { CR, LF, Control, Extend, Regional_Indicator, SpacingMark, L, V, T, LV, LVT } = require('./classes.json');
const UnicodeTrie = require('unicode-trie');
const fs = require('fs');
const classTrie = new UnicodeTrie(fs.readFileSync(__dirname + '/classes.trie'));

// Gets a code point from a UTF-16 string
// handling surrogate pairs appropriately
const codePointAt = function (str, idx) {
  let hi, low;
  idx = idx || 0;
  const code = str.charCodeAt(idx);

  // High surrogate
  if (0xD800 <= code && code <= 0xDBFF) {
    hi = code;
    low = str.charCodeAt(idx + 1);
    if (0xDC00 <= low && low <= 0xDFFF) {
      return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
    }

    return hi;
  }

  // Low surrogate
  if (0xDC00 <= code && code <= 0xDFFF) {
    hi = str.charCodeAt(idx - 1);
    low = code;
    if (0xD800 <= hi && hi <= 0xDBFF) {
      return ((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000;
    }

    return low;
  }

  return code;
};

// Returns whether a break is allowed between the
// two given grapheme breaking classes
const shouldBreak = function (previous, current) {
  // GB3. CR X LF
  if ((previous === CR) && (current === LF)) {
    return false;

    // GB4. (Control|CR|LF) ÷
  } else if ([Control, CR, LF].includes(previous)) {
    return true;

    // GB5. ÷ (Control|CR|LF)
  } else if ([Control, CR, LF].includes(current)) {
    return true;

    // GB6. L X (L|V|LV|LVT)
  } else if ((previous === L) && [L, V, LV, LVT].includes(current)) {
    return false;

    // GB7. (LV|V) X (V|T)
  } else if ([LV, V].includes(previous) && [V, T].includes(current)) {
    return false;

    // GB8. (LVT|T) X (T)
  } else if ([LVT, T].includes(previous) && (current === T)) {
    return false;

    // GB8a. Regional_Indicator X Regional_Indicator
  } else if ((previous === Regional_Indicator) && (current === Regional_Indicator)) {
    return false;

    // GB9. X Extend
  } else if (current === Extend) {
    return false;

    // GB9a. X SpacingMark
  } else if (current === SpacingMark) {
    return false;
  }

  // GB9b. Prepend X (there are currently no characters with this class)
  //else if (previous === Prepend) {
  //  return false;
  //}

  // GB10. Any ÷ Any
  return true;
};

// Returns the next grapheme break in the string after the given index
exports.nextBreak = function (string, index) {
  if (index == null) {
    index = 0;
  }
  if (index < 0) {
    return 0;
  }

  if (index >= (string.length - 1)) {
    return string.length;
  }

  let prev = classTrie.get(codePointAt(string, index));
  for (let i = index + 1; i < string.length; i++) {
    // check for already processed low surrogates
    var middle, middle1;
    if ((0xd800 <= (middle = string.charCodeAt(i - 1)) && middle <= 0xdbff) &&
      (0xdc00 <= (middle1 = string.charCodeAt(i)) && middle1 <= 0xdfff)) {
      continue;
    }

    const next = classTrie.get(codePointAt(string, i));
    if (shouldBreak(prev, next)) {
      return i;
    }

    prev = next;
  }

  return string.length;
};

// Returns the next grapheme break in the string before the given index
exports.previousBreak = function (string, index) {
  if (index == null) {
    index = string.length;
  }
  if (index > string.length) {
    return string.length;
  }

  if (index <= 1) {
    return 0;
  }

  index--;
  let next = classTrie.get(codePointAt(string, index));
  for (let i = index - 1; i >= 0; i--) {
    // check for already processed high surrogates
    var middle, middle1;
    if ((0xd800 <= (middle = string.charCodeAt(i)) && middle <= 0xdbff) &&
      (0xdc00 <= (middle1 = string.charCodeAt(i + 1)) && middle1 <= 0xdfff)) {
      continue;
    }

    const prev = classTrie.get(codePointAt(string, i));
    if (shouldBreak(prev, next)) {
      return i + 1;
    }

    next = prev;
  }

  return 0;
};

// Breaks the given string into an array of grapheme cluster strings
exports.break = function (str) {
  let brk;
  const res = [];
  let index = 0;

  while ((brk = exports.nextBreak(str, index)) < str.length) {
    res.push(str.slice(index, brk));
    index = brk;
  }

  if (index < str.length) {
    res.push(str.slice(index));
  }

  return res;
};

// Returns the number of grapheme clusters there are in the given string
exports.countBreaks = function (str) {
  let brk;
  let count = 0;
  let index = 0;

  while ((brk = exports.nextBreak(str, index)) < str.length) {
    index = brk;
    count++;
  }

  if (index < str.length) {
    count++;
  }

  return count;
};
