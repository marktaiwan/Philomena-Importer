import {makeAbsolute} from './util';
declare const marked;

const rules = marked.Lexer.rules;
const noop = (): void => { /* noop */ };
const useDefault = (): false => false;
const wrap = (text: string, openTag: string, closeTag?: string): string => {
  closeTag ??= openTag;
  const multiline = (/\n/).test(text);
  if (multiline) {
    openTag = '[' + openTag;
    closeTag = closeTag + ']';
  }
  return openTag + text + closeTag;
};

function markedjs(text: string, baseUrl: string): string {
  const tokenizer = {
    space: src => {
      const cap = rules.block.newline.exec(src);
      if (cap) {
        return {
          type: 'space',
          raw: cap[0]
        };
      }
    },
    fences: src => {
      const cap = rules.block.fences.exec(src);
      if (cap) {
        const raw = cap[0].trimEnd();
        const text = cap[3] ?? '';
        return {
          type: 'code',
          raw,
          text,
        };
      }
    },
    blockquote: src => {
      // not perfect, but this is closest I could get
      const re = /^ {0,3}>(?: |\n).*(?:\n|$)(?:(?:(?!\s+\n).+(?:\n|$))|(?:\n+ {0,3}>(?: |\n)))*/;
      const cap = re.exec(src);
      if (cap) {
        return {
          type: 'blockquote',
          raw: cap[0],
          text: cap[0]
            .replace(/^ *>(?: |$)/gm, ''),
        };
      }
    },
    // block rules
    heading: noop,
    code: noop,
    nptable: noop,
    hr: noop,
    list: noop,
    html: noop,
    def: noop,
    table: noop,
    lheading: noop,
    paragraph: useDefault,
    // inline rules
    escape: noop,
    tag: noop,
    br: noop,
    del: useDefault,
    autolink: noop,
    url: useDefault,
  };

  const renderer = {
    paragraph: text => text,
    code: code => {
      const multiline = (/\n/).test(code);
      const openTag = multiline ? '@==' : '@';
      const closeTag = multiline ? '==@' : '@';
      return openTag + code + closeTag;
    },
    blockquote: quote => {
      quote = quote.replace(/^\n/gm, '');
      return quote.endsWith('\n')
        ? '[bq]' + quote.slice(0, -1) + '[/bq]\n'
        : '[bq]' + quote + '[/bq]';
    },
    link: (href, title, text) => {
      text = text.replaceAll('"', '[=="==]');
      return '"' + text + '":' + makeAbsolute(href, baseUrl);
    },
    image: href => wrap(makeAbsolute(href, baseUrl), '!'),
    codespan: text => wrap(text, '@'),
    del: text => wrap(text, '-'),
    strong: text => wrap(text, '*'),
    em: text => wrap(text, '_'),
  };

  const walkTokens = token => {
    const {text} = token;
    if (text) {
      // unescape
      const escapeReplacements = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': '\'',
      };
      token.text = text.replace(
        /&(?:amp|lt|gt|quot|#39);/g,
        (...cap) => escapeReplacements[cap[0]]
      );
    }
    if (token.type == 'space') {
      token.type = 'text';
      token.text = token.raw;
    }
  };

  marked.use({tokenizer, renderer, walkTokens});
  return marked.parse(text);
}

export default markedjs;
