const request = require('request');
const fs = require('fs');
const UnicodeTrieBuilder = require('unicode-trie/builder');

const UNICODE_VERSION = '8.0.0';
const BASE_URL = `http://www.unicode.org/Public/${UNICODE_VERSION}/ucd`;

// this loads the GraphemeBreakProperty.txt file for Unicode 8.0.0 and parses it to
// combine ranges and generate JavaScript
request(`${BASE_URL}/auxiliary/GraphemeBreakProperty.txt`, function (err, res, data) {
  let match;
  const re = /^([0-9A-F]+)(?:\.\.([0-9A-F]+))?\s*;\s*([A-Za-z_]+)/gm;
  let nextClass = 1;
  const classes = { Other: 0 };

  const trie = new UnicodeTrieBuilder(classes.Other);

  // collect entries in the table into ranges
  // to keep things smaller.
  while ((match = re.exec(data))) {
    const start = match[1];
    const end = match[2] != null ? match[2] : start;
    const type = match[3];
    if (classes[type] == null) {
      classes[type] = nextClass++;
    }

    trie.setRange(parseInt(start, 16), parseInt(end, 16), classes[type]);
  }

  // write the trie to a file
  fs.writeFileSync(__dirname + '/classes.trie', trie.toBuffer());

  // write classes to a file
  fs.writeFileSync(__dirname + '/classes.json', JSON.stringify(classes));
});
