import markedjs from './markedjsWrapper';

type SyntaxMapping = {
  textile: {open: string, close?: string, multiline?: boolean},
  markdown: {open: string, close?: string},
};

function escapeRegExp(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function textileRegExpMaker(open: string, close: string, flag: string): RegExp {
  open = escapeRegExp(open);
  close = escapeRegExp(close);
  return new RegExp(
    `(?<![a-zA-Z0-9])${open}(\\S(?:.*?\\S)??)${close}(?![a-zA-Z0-9])`
    + '|'
    + `\\[${open}(?!${close})((?:.|\\n)+?)${close}\\]`,
    flag);
}

function textileToMarkdown(text: string): string {
  function convertQuotes(text: string): string {
    const splitAtToken = (
      str: string, tokenLength: number, index: number
    ): [left: string, right: string] => [str.slice(0, index), str.slice(index + tokenLength)];
    const OPEN_TAG = '[bq]';
    const CLOSE_TAG = '[/bq]';
    const NEWLINE = '\n';
    const matchToken = new RegExp([OPEN_TAG, CLOSE_TAG, NEWLINE].map(escapeRegExp).join('|'));

    // Split the input into lines annotated with the current nesting level
    //
    // ...then make it look presentable (and largely correct) when
    // printed, through a series of contrived bullshit I lost the ability
    // to grok some 5 rewrites ago
    const lines: Array<{nestLevel: number, content: string}> = [];
    let result: RegExpMatchArray;
    let nestLevel = 0;
    let prevToken: string = null;
    do {
      result = text.match(matchToken);
      if (result) {
        const token = result[0];
        const [splitLeft, splitRight] = splitAtToken(text, token.length, result.index);
        text = splitRight;

        switch (token) {
          case OPEN_TAG:
            if (splitLeft != '') lines.push({nestLevel, content: splitLeft});
            if (prevToken != NEWLINE) lines.push({nestLevel, content: ''});
            if (!splitRight.startsWith(NEWLINE)) text = NEWLINE + text;
            nestLevel += 1;
            break;
          case CLOSE_TAG:
            if (nestLevel > 0) {
              if (prevToken != NEWLINE || splitLeft != '') lines.push({nestLevel, content: splitLeft});
              if (!splitRight.startsWith(NEWLINE)) text = NEWLINE + text;
              nestLevel -= 1;
            } else {
              lines.push({nestLevel, content: splitLeft + CLOSE_TAG});
              if (splitRight.startsWith(NEWLINE)) lines.push({nestLevel, content: ''});
            }
            break;
          case NEWLINE:
            if (splitLeft != '' || prevToken == NEWLINE || lines.length == 0) lines.push({nestLevel, content: splitLeft});
            if (splitLeft == '' && prevToken == CLOSE_TAG && splitRight.startsWith(OPEN_TAG)) lines.push({nestLevel: 0, content: ''});
            if (splitRight == '') lines.push({nestLevel, content: ''});
            break;
        }

        prevToken = token;
      } else {
        // no more matches
        if (text != '') lines.push({nestLevel, content: text});
      }
    } while (result !== null);

    // nestLevel >0 indicates an unclosed [bq] tag,
    // work backwards from the last line and decrement
    // the nest level of each line until encountered 0,
    // then append [bq] to end of that line
    while (nestLevel-- > 0) {
      const lastIndex = lines.length - 1;
      let i = lastIndex;
      let currLine = lines[i];
      while (currLine.nestLevel > 0) {
        currLine.nestLevel -= 1;
        currLine = lines[--i];
      }
      currLine.content += OPEN_TAG;
    }

    // merge lines with unmatched open and close
    // tags with the line below it
    for (let i = 0; i < lines.length - 1; ++i) {
      const currLine = lines[i];
      if (currLine.content.endsWith(OPEN_TAG) || currLine.content.endsWith(CLOSE_TAG)) {
        currLine.content += lines[i + 1].content;
        lines.splice(i + 1, 1);
      }
    }

    // insert additional linebreaks at quote/non-quote boundary
    for (let i = 1; i < lines.length; ++i) {
      const prevLine = lines[i - 1];
      const currLine = lines[i];
      if (prevLine.content != '' && currLine.content != ''
        && prevLine.nestLevel != currLine.nestLevel) {
        prevLine.content += '\n';
      }
    }

    // putting it all together
    text = lines.map(line => (line.nestLevel > 0)
      ? '> '.repeat(line.nestLevel) + line.content
      : line.content
    ).join('\n');

    return text;
  }

  // links
  text = text.replace(
    /"(.+?)":((?:\/|\w+:\/\/)(?:\w|\/|\)|(?:\S(?!$|[\n ])))+)/g,
    (matched, text, path) => `[${text}](${path})`
  );

  // image embeds with links
  text = text.replace(
    /!((?:\/|\w+:\/\/)\S+)!:((?:\/|\w+:\/\/)(?:\w|\/|\)|(?:\S(?!$|[\n ])))+)/g,
    (matched, img, link) => `[![](${img})](${link})`);

  // image embed with no links
  text = text.replace(
    /!((?:https?:\/)?\/\S+)!/g,
    (matched, url) => `![](${url})`
  );

  // bold, italic, underline, spoiler, code, strike, noParse
  const tagMapping: SyntaxMapping[] = [
    {textile: {open: '[==', close: '==]'}, markdown: {open: ''}},
    {textile: {open: '~'}, markdown: {open: ''}},
    {textile: {open: '*'}, markdown: {open: '**'}},
    {textile: {open: '_'}, markdown: {open: '*'}},
    {textile: {open: '+'}, markdown: {open: '_'}},
    {textile: {open: '[spoiler]', close: '[/spoiler]'}, markdown: {open: '=='}},
    {textile: {open: '@'}, markdown: {open: '`'}},
    {textile: {open: '-'}, markdown: {open: '~~'}},
  ];
  for (const {textile, markdown} of tagMapping) {
    textile.close ??= textile.open;
    markdown.close ??= markdown.open;
    text = text.replace(
      textileRegExpMaker(textile.open, textile.close, 'g'),
      (matched, p1, p2) => `${markdown.open}${p1 || p2}${markdown.close}`
    );
  }

  // escape > at the beginning of a line
  text = text.replace(/^>/gm, '\\>');

  // superscript
  text = text.replace(
    textileRegExpMaker('^', '^', 'g'),
    (matched, p1, p2) => (p1 || p2).replace(/\b\w/g, char => '^' + char)
  );

  // quotes
  text = convertQuotes(text);

  // double space before linebreaks
  // text = text.replace(/(?<=\S)\n|\r\n(?=\S)/g, '  \n');

  return text;
}

function markdownRegExpMaker(open: string, close: string, flag: string): RegExp {
  open = escapeRegExp(open);
  close = escapeRegExp(close);
  return new RegExp(`${open}(?!${close})(\\S(?:(?:.|\n)*?\\S)??)${close}`, flag);
}

function markdownToTextile(text: string, baseUrl = ''): string {
  const tagMapping: SyntaxMapping[] = [
    {markdown: {open: '_'}, textile: {open: '+', multiline: false}},
    {markdown: {open: '=='}, textile: {open: '[spoiler]', close: '[/spoiler]', multiline: true}},
  ];
  // Markedjs doesn't support spoiler and underline
  for (const {markdown, textile} of tagMapping) {
    markdown.close ??= markdown.open;
    textile.close ??= textile.open;
    text = text.replace(
      markdownRegExpMaker(markdown.open, markdown.close, 'g'),
      (matched, p1) => {
        let open = textile.open;
        let close = textile.close;
        if ((/\n/).test(p1) && !textile.multiline) {
          open = '[' + open;
          close = close + ']';
        }
        return open + p1 + close;
      }
    );
  }
  text = markedjs(text, baseUrl);
  return text;
}

export {textileToMarkdown, markdownToTextile};
