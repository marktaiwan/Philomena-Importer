// ==UserScript==
// @name        Derpibooru Image Importer
// @description Import image and tags from Philomena-based boorus
// @version     1.9.8
// @author      Marker
// @license     MIT
// @namespace   https://github.com/marktaiwan/
// @homepageURL https://github.com/marktaiwan/Philomena-Importer
// @supportURL  https://github.com/marktaiwan/Philomena-Importer/issues
// @match       *://*.derpibooru.org/*
// @match       *://*.trixiebooru.org/*
// @match       *://*.ronxgr5zb4dkwdpt.onion/*
// @match       *://*.ponybooru.org/*
// @match       *://*.ponerpics.org/*
// @match       *://*.ponerpics.com/*
// @match       *://*.twibooru.org/*
// @connect     derpibooru.org
// @connect     derpicdn.net
// @connect     ponybooru.org
// @connect     ponerpics.org
// @connect     ponerpics.com
// @inject-into content
// @noframes
// @require     https://github.com/marktaiwan/Derpibooru-Unified-Userscript-Ui/raw/master/derpi-four-u.js?v1.2.3
// @require     https://cdn.jsdelivr.net/npm/marked@2.0.3/marked.min.js
// @grant       GM_xmlhttpRequest
// ==/UserScript==
(function () {
  'use strict';

  /* Shorthands  */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }
  function create(ele) {
    return document.createElement(ele);
  }
  /* Url */
  function makeAbsolute(path, domain) {
    return /^(?:https?:)?\/\//.test(path)
      ? path
      : domain + (path.startsWith('/') ? path : '/' + path);
  }
  function escapeRegExp(str) {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  const SCRIPT_ID = 'image_importer';
  const boorus = {
    ponybooru: {
      primaryDomain: 'https://ponybooru.org',
      prettyName: 'Ponybooru',
      booruDomains: ['ponybooru.org'],
      cdnDomains: ['cdn.ponybooru.org'],
      uploadPage: '/images/new',
      importTag: siteName => `${siteName} import`,
      markdown: true,
    },
    ponerpics: {
      primaryDomain: 'https://ponerpics.org',
      prettyName: 'Ponerpics',
      booruDomains: ['ponerpics.org', 'ponerpics.com'],
      cdnDomains: ['ponerpics.org', 'ponerpics.com'],
      uploadPage: '/images/new',
      importTag: siteName => `imported from ${siteName}`,
    },
    twibooru: {
      primaryDomain: 'https://twibooru.org',
      prettyName: 'Twibooru',
      booruDomains: ['twibooru.org', 'twibooru.com'],
      cdnDomains: ['cdn.twibooru.org', 'cdn.twibooru.com'],
      uploadPage: '/posts/new',
      importTag: siteName => `${siteName} import`,
      bor: true,
      markdown: true,
    },
    derpibooru: {
      primaryDomain: 'https://derpibooru.org',
      prettyName: 'Derpibooru',
      booruDomains: ['derpibooru.org', 'trixiebooru.org', 'ronxgr5zb4dkwdpt.onion'],
      cdnDomains: ['derpicdn.net'],
      uploadPage: '/images/new',
      importTag: siteName => `${siteName} import`,
      markdown: true,
    },
    manebooru: {
      primaryDomain: 'https://manebooru.art/',
      prettyName: 'Manebooru',
      booruDomains: ['manebooru.art'],
      cdnDomains: ['static.manebooru.art'],
    },
  };
  const DEFAULT_TAG_BLACKLIST = [
    'adventure in the comments',
    'banned from derpibooru',
    'banned tags',
    'changelings in the comments',
    'clopfic in the comments',
    'comments locked down',
    'comments more entertaining',
    'debate in the comments',
    'deleted from derpibooru',
    'derail in the comments',
    'derpibooru exclusive',
    'derpibooru import',
    'discussion in the comments',
    'duckery in the comments',
    'featured image',
    'hfh',
    'image',
    'imported from derpibooru',
    'imported from manebooru',
    'imported from ponerpics',
    'imported from ponybooru',
    'imported from twibooru',
    'index get',
    'jpeg',
    'manebooru exclusive',
    'manebooru original',
    'mp4',
    'paste',
    'paywalled source',
    'png',
    'politics in the comments',
    'ponerpics exclusive',
    'ponerpics import',
    'ponibooru import',
    'ponybooru exclusive',
    'ponybooru import',
    'shipping war in the comments',
    'song in the comments',
    'story in the comments',
    'translated in the comments',
    'twibooru exclusive',
    'twibooru import',
  ];
  const config = ConfigManager(
    'Philomena Image Importer',
    SCRIPT_ID,
    'Import image and tags from Philomena-based boorus.'
  );
  config.registerSetting({
    title: 'Quick upload',
    key: 'quick_upload',
    description:
      'Turn the upload button into a dropdown menu for uploading current image to other sites.',
    type: 'checkbox',
    defaultValue: true,
  });
  config.registerSetting({
    title: 'Link correction',
    key: 'link_fix',
    description: 'Rewrite on-site links in the description to properly point to the original site.',
    type: 'checkbox',
    defaultValue: true,
  });
  config.registerSetting({
    title: 'Use origin as source',
    key: 'origin_source',
    description: 'Use the original post as source link if the imported image lacks one.',
    type: 'checkbox',
    defaultValue: false,
  });
  const descFieldset = config.addFieldset(
    'Description',
    'indicate_fieldset',
    'Add import message to image description. Prefix the description with a link to the original post.'
  );
  descFieldset.registerSetting({
    title: 'Enable import message',
    key: 'indicate_import',
    type: 'checkbox',
    defaultValue: false,
  });
  descFieldset.registerSetting({
    title: 'Include original upload date',
    key: 'orig_upload_date',
    type: 'checkbox',
    defaultValue: false,
  });
  descFieldset.registerSetting({
    title: 'Include original uploader',
    key: 'orig_uploader',
    type: 'checkbox',
    defaultValue: false,
  });
  const tagFieldset = config.addFieldset('Tag Filtering', 'tag_filtering');
  tagFieldset.registerSetting({
    title: 'Enable tag filtering',
    key: 'tag_filter',
    type: 'checkbox',
    defaultValue: true,
  });
  tagFieldset.registerSetting({
    title: 'Add "import" tag',
    key: 'indicate_import_tag',
    description:
      'Add a "<site> import" tag for sites with a standardized tagging convention for imported images',
    type: 'checkbox',
    defaultValue: true,
  });
  tagFieldset.registerSetting({
    title: 'Subscribe to default filter',
    key: 'sub_default',
    description:
      'Filter tags from the default list in addition to the user defined tags. The list stays current with script updates.',
    type: 'checkbox',
    defaultValue: true,
  });
  const tagEntry = tagFieldset.registerSetting({
    title: 'Remove these tags:',
    key: 'tag_blacklist',
    description: 'These tags will be removed during import. Comma separated.',
    type: 'text',
    defaultValue: DEFAULT_TAG_BLACKLIST.join(', '),
  });
  const QUICK_UPLOAD = config.getEntry('quick_upload');
  const LINK_FIX = config.getEntry('link_fix');
  const ORIGIN_SOURCE = config.getEntry('origin_source');
  const INDICATE_IMPORT = config.getEntry('indicate_import');
  const ORIG_UPLOAD_DATE = config.getEntry('orig_upload_date');
  const ORIG_UPLOADER = config.getEntry('orig_uploader');
  const TAG_FILTER = config.getEntry('tag_filter');
  const INDICATE_IMPORT_TAG = config.getEntry('indicate_import_tag');
  const SUB_DEFAULT = config.getEntry('sub_default');
  /*
   *  Perform coding surgery to change input field into textarea
   */
  const oldInput = $('input', tagEntry);
  const newText = create('textarea');
  newText.classList.add('input');
  newText.style.height = '100px';
  newText.style.width = '100%';
  // copy over attributes
  newText.id = oldInput.id;
  newText.dataset.defaultValue = oldInput.dataset.defaultValue;
  newText.dataset.entryKey = oldInput.dataset.entryKey;
  newText.dataset.entryPropertyType = oldInput.dataset.entryPropertyType;
  newText.value = oldInput.value;
  // remove old attribute that conflicts with derpi4u
  oldInput.removeAttribute('data-entry-key');
  oldInput.removeAttribute('id');
  newText.addEventListener('change', () => {
    oldInput.dispatchEvent(new Event('change'));
  });
  oldInput.insertAdjacentElement('afterend', newText);
  oldInput.classList.add('hidden');

  function getImageInfo(url) {
    const domainRegexStr = concatDomains(boorus, 'booruDomains');
    const cdnRegexStr = concatDomains(boorus, 'cdnDomains');
    const regex = new RegExp(
      'https?://(?:www\\.)?(?:' +
        `(?<domain>${domainRegexStr})/(?:images/|posts/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?|` +
        `(?<cdn>${cdnRegexStr})/img/(?:view/|download/)?\\d+/\\d+/\\d+/(?<cdnID>\\d+)` +
        ')',
      'i'
    );
    const result = regex.exec(url);
    if (result === null) {
      console.error('Failed to match input URL.');
      return;
    }
    const {domain, cdn, domID, cdnID} = result.groups;
    const id = domID || cdnID;
    const matchedDomain = domain || cdn;
    const booruData = getDomainInfo(matchedDomain);
    return {id, booruData};
  }
  function matchDomain(domain) {
    for (const booru of Object.values(boorus)) {
      const validDomains = [...booru.booruDomains, ...booru.cdnDomains];
      if (
        validDomains.some(validDomain => RegExp(`${escapeRegExp(validDomain)}$`, 'i').test(domain))
      ) {
        return {booru, validDomains};
      }
    }
  }
  function concatDomains(boorus, prop) {
    const arr = [];
    for (const booru of Object.values(boorus)) {
      for (const domain of booru[prop]) {
        const regexStr = domain.replace(/\./g, '\\.');
        arr.push(regexStr);
      }
    }
    return arr.join('|');
  }
  function getDomainInfo(domain) {
    const {booru} = matchDomain(domain);
    return booru;
  }
  function isSameSite(domainlist) {
    return domainlist.includes(window.location.host);
  }

  function fetchMeta(imageID, booruData) {
    const {primaryDomain} = booruData;
    const requestURL = booruData.bor
      ? `${primaryDomain}/api/v3/posts/${imageID}`
      : `${primaryDomain}/api/v1/json/images/${imageID}`;
    return makeRequest(requestURL).then(resp => resp.response);
  }
  function makeRequest(url, responseType = 'json', onprogress, button) {
    return new Promise(resolve => {
      GM_xmlhttpRequest({
        context: button,
        url,
        method: 'GET',
        headers: {
          'User-Agent': navigator.userAgent,
        },
        responseType,
        onload: resolve,
        onerror: e => {
          e.context.innerText = 'Error';
          console.log(e);
        },
        onprogress,
      });
    });
  }

  const rules = marked.Lexer.rules;
  const noop = () => {};
  const useDefault = () => false;
  const wrap = (text, openTag, closeTag) => {
    closeTag ?? (closeTag = openTag);
    const multiline = /\n/.test(text);
    if (multiline) {
      openTag = '[' + openTag;
      closeTag = closeTag + ']';
    }
    return openTag + text + closeTag;
  };
  function markedjs(text, baseUrl) {
    const tokenizer = {
      space: src => {
        const cap = rules.block.newline.exec(src);
        if (cap) {
          return {
            type: 'space',
            raw: cap[0],
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
            text: cap[0].replace(/^ *>(?: |$)/gm, ''),
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
        const multiline = /\n/.test(code);
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
          '&#39;': "'",
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

  function textileRegExpMaker(open, close, flag) {
    open = escapeRegExp(open);
    close = escapeRegExp(close);
    return new RegExp(
      `(?<![a-zA-Z0-9])${open}(\\S(?:.*?\\S)??)${close}(?![a-zA-Z0-9])` +
        '|' +
        `\\[${open}(?!${close})((?:.|\\n)+?)${close}\\]`,
      flag
    );
  }
  function textileToMarkdown(text) {
    function convertQuotes(text) {
      const splitAtToken = (str, tokenLength, index) => [
        str.slice(0, index),
        str.slice(index + tokenLength),
      ];
      const OPEN_TAG = '[bq]';
      const CLOSE_TAG = '[/bq]';
      const NEWLINE = '\n';
      const matchToken = new RegExp([OPEN_TAG, CLOSE_TAG, NEWLINE].map(escapeRegExp).join('|'));
      // Split the input into lines annotated with the current nesting level
      //
      // ...then make it look presentable (and largely correct) when
      // printed, through a series of contrived bullshit I lost the ability
      // to grok some 5 rewrites ago
      const lines = [];
      let result;
      let nestLevel = 0;
      let prevToken = null;
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
                if (prevToken != NEWLINE || splitLeft != '')
                  lines.push({nestLevel, content: splitLeft});
                if (!splitRight.startsWith(NEWLINE)) text = NEWLINE + text;
                nestLevel -= 1;
              } else {
                lines.push({nestLevel, content: splitLeft + CLOSE_TAG});
                if (splitRight.startsWith(NEWLINE)) lines.push({nestLevel, content: ''});
              }
              break;
            case NEWLINE:
              if (splitLeft != '' || prevToken == NEWLINE || lines.length == 0)
                lines.push({nestLevel, content: splitLeft});
              if (splitLeft == '' && prevToken == CLOSE_TAG && splitRight.startsWith(OPEN_TAG))
                lines.push({nestLevel: 0, content: ''});
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
        if (
          prevLine.content != '' &&
          currLine.content != '' &&
          prevLine.nestLevel != currLine.nestLevel
        ) {
          prevLine.content += '\n';
        }
      }
      // putting it all together
      text = lines
        .map(line =>
          line.nestLevel > 0 ? '> '.repeat(line.nestLevel) + line.content : line.content
        )
        .join('\n');
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
      (matched, img, link) => `[![](${img})](${link})`
    );
    // image embed with no links
    text = text.replace(/!((?:https?:\/)?\/\S+)!/g, (matched, url) => `![](${url})`);
    // bold, italic, underline, spoiler, code, strike, noParse
    const tagMapping = [
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
      textile.close ?? (textile.close = textile.open);
      markdown.close ?? (markdown.close = markdown.open);
      text = text.replace(
        textileRegExpMaker(textile.open, textile.close, 'g'),
        (matched, p1, p2) => `${markdown.open}${p1 || p2}${markdown.close}`
      );
    }
    // escape > at the beginning of a line
    text = text.replace(/^>/gm, '\\>');
    // superscript
    text = text.replace(textileRegExpMaker('^', '^', 'g'), (matched, p1, p2) =>
      (p1 || p2).replace(/\b\w/g, char => '^' + char)
    );
    // quotes
    text = convertQuotes(text);
    // double space before linebreaks
    // text = text.replace(/(?<=\S)\n|\r\n(?=\S)/g, '  \n');
    return text;
  }
  function markdownRegExpMaker(open, close, flag) {
    open = escapeRegExp(open);
    close = escapeRegExp(close);
    return new RegExp(`${open}(?!${close})(\\S(?:(?:.|\n)*?\\S)??)${close}`, flag);
  }
  function markdownToTextile(text, baseUrl = '') {
    const tagMapping = [
      {markdown: {open: '_'}, textile: {open: '+', multiline: false}},
      {markdown: {open: '=='}, textile: {open: '[spoiler]', close: '[/spoiler]', multiline: true}},
    ];
    // Markedjs doesn't support spoiler and underline
    for (const {markdown, textile} of tagMapping) {
      markdown.close ?? (markdown.close = markdown.open);
      textile.close ?? (textile.close = textile.open);
      text = text.replace(
        markdownRegExpMaker(markdown.open, markdown.close, 'g'),
        (matched, p1) => {
          let open = textile.open;
          let close = textile.close;
          if (/\n/.test(p1) && !textile.multiline) {
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

  function processDescription(
    originalDescription,
    imageID,
    sourceBooruData,
    targetBooruData,
    imgJson
  ) {
    const {primaryDomain, prettyName} = sourceBooruData;
    const emptyDesc = originalDescription === '';
    const imgPath = !sourceBooruData.bor ? 'images' : 'posts';
    let desc = originalDescription;
    if (LINK_FIX && !emptyDesc) {
      if (sourceBooruData.markdown) {
        // image links
        desc = desc.replace(
          /(?:>>(\d+))([pts])?/g,
          (matched, id, postfix) =>
            `[>>[${prettyName}]${[id, postfix].join('')}](${primaryDomain}/${imgPath}/${id})`
        );
      } else {
        // rewrite in-site links
        // match links begin with "/" but not "//"
        desc = desc.replace(
          /(".+?"):(?:\/)(?!\/)/g,
          (matched, text) => `${text}:${primaryDomain}/`
        );
        // rewrite image links
        // match image links, turn embeds into links as well.
        desc = desc.replace(
          /(?:>>(\d+))([pts])?/g,
          (matched, id, postfix) =>
            `">>[${prettyName}]${[id, postfix].join('')}":${primaryDomain}/${imgPath}/${id}`
        );
      }
    }
    // Half-assed textile <-> markdown conversion
    if (!emptyDesc || INDICATE_IMPORT) {
      if (targetBooruData.markdown && !sourceBooruData.markdown) desc = textileToMarkdown(desc);
      if (sourceBooruData.markdown && !targetBooruData.markdown)
        desc = markdownToTextile(desc, primaryDomain);
    }
    if (INDICATE_IMPORT) {
      const created_at = imgJson.created_at;
      const uploader = 'uploader' in imgJson ? imgJson.uploader : 'Anonymous';
      let msg = targetBooruData.markdown
        ? `[[Imported from ${prettyName}]](${primaryDomain}/${imgPath}/${imageID})`
        : `"[Imported from ${prettyName}]":${primaryDomain}/${imgPath}/${imageID}`;
      if (ORIG_UPLOAD_DATE) msg += `\nOriginal upload date: ${created_at}`;
      if (ORIG_UPLOADER) msg += `\nOriginal uploader: ${uploader ? uploader : 'Anonymous'}`;
      const divider = targetBooruData.markdown ? '---' : '@==----------------==@';
      desc = emptyDesc ? msg : msg + `\n\n${divider}\n\n` + desc;
    }
    return desc;
  }
  function performTagFilter(tagList) {
    if (!TAG_FILTER) return tagList;
    const userFilter = tagsToArray(config.getEntry('tag_blacklist'));
    const filtered_tags = SUB_DEFAULT
      ? [...DEFAULT_TAG_BLACKLIST, ...userFilter] // Dupes doesn't matter
      : userFilter;
    return tagList.filter(tag => !filtered_tags.includes(tag));
  }
  function performTagReplacement(tagPool) {
    replaceTag(tagPool, 'unofficial characters only', 'oc only');
    replaceTag(tagPool, 'glow-in-the-dark', 'glow in the dark');
    replaceTag(tagPool, 'unauthorized edit', 'edit');
    replaceTag(tagPool, 'pony pussy', 'anatomically correct');
    replaceTag(tagPool, 'human on filly action', 'human on filly');
    replaceTag(tagPool, 'gryphon', 'griffon');
    replaceTag(tagPool, 'mobile phone', 'cellphone');
    if (tagPool.some(tag => tag.startsWith('ponified:'))) {
      tagPool.forEach(removeNamespace('ponified:'));
      addTag(tagPool, 'ponified');
    }
    tagPool.forEach(removeNamespace('species:'));
    tagPool.forEach(removeNamespace('character:'));
    return tagPool;
  }
  function performTagCleanUp(tagPool) {
    if (tagPool.some(tag => tag.startsWith('artist:'))) removeTag(tagPool, 'artist needed');
    if (tagPool.some(tag => tag.startsWith('oc:'))) removeTag(tagPool, 'unknown oc');
    return tagPool;
  }
  function addTag(tagPool, tagToAdd) {
    if (!tagPool.includes(tagToAdd)) tagPool.push(tagToAdd);
  }
  function removeTag(tagPool, tagToRemove) {
    const tagIndex = tagPool.findIndex(tag => tag == tagToRemove);
    if (tagIndex > -1) tagPool.splice(tagIndex, 1);
  }
  function replaceTag(tagPool, oldTag, newTag) {
    if (tagPool.includes(oldTag)) {
      removeTag(tagPool, oldTag);
      addTag(tagPool, newTag);
    }
  }
  function removeNamespace(namespace) {
    return (tag, index, tagPool) => {
      if (tag.startsWith(namespace)) tagPool[index] = tag.slice(namespace.length);
    };
  }
  function tagsToArray(str) {
    return str.split(',').map(tag => tag.trim());
  }

  async function importImage(imageID, booruData) {
    const targetBooruData = getDomainInfo(window.location.host);
    const {primaryDomain} = booruData;
    const importButton = $(`#${SCRIPT_ID}_import_button`);
    importButton.innerText = 'Loading...';
    // fetch image metadata
    const json = await fetchMeta(imageID, booruData);
    const metadata = booruData.bor ? json.post : json.image;
    const {
      description,
      mime_type: mimeType,
      source_url: source,
      tags,
      name,
      format: ext,
    } = metadata;
    const imgPath = booruData.bor ? 'posts' : 'images';
    // booru-on-rail doesn't accept filenames without extension
    const fileName = /\.(?:jpg|jpeg|png|gif|webm|mp4)$/i.test(name) ? name : name + '.' + ext;
    // special case for svg uploads
    const fileURL =
      mimeType !== 'image/svg+xml'
        ? metadata.representations.full
        : metadata.representations.full.replace('/view/', '/download/').replace(/\.\w+$/, '.svg');
    // #image_tag_input: Ponerpics
    // #tags-form_tag_input: Derpibooru, Ponybooru
    // #post_tag_input: Twibooru
    const tagInput = $('#image_tag_input, #tags-form_tag_input, #post_tag_input');
    const fancyEditor = tagInput.classList.contains('hidden');
    // change to plain editor
    if (fancyEditor) {
      // "Plain editor" button
      $('.js-taginput-hide').click();
    }
    // add source
    $('#image_source_url, #post_source_url').value = source
      ? source
      : ORIGIN_SOURCE
      ? `${primaryDomain}/${imgPath}/${imageID}`
      : '';
    // add tags
    const newTags = performTagFilter(tags);
    performTagReplacement(newTags);
    performTagCleanUp(newTags);
    if (INDICATE_IMPORT_TAG && targetBooruData.importTag) {
      // site has a standardized tagging convention for imported images
      const sourceName = booruData.prettyName.toLowerCase();
      newTags.push(targetBooruData.importTag(sourceName));
    }
    tagInput.value = newTags.join(', ');
    // add description
    $('#image_description, #image_description, #post_description').value = processDescription(
      description,
      imageID,
      booruData,
      targetBooruData,
      metadata
    );
    // revert tag editor
    if (fancyEditor) {
      // "Fancy Editor" button
      $('.js-taginput-show').click();
    }
    // fetch full image
    const fileField = $('#image_image, #post_file');
    const imgBlob = await makeRequest(
      makeAbsolute(fileURL, primaryDomain),
      'blob',
      progressCallback,
      importButton
    ).then(resp => (resp.status == 200 ? resp.response : null));
    if (imgBlob !== null) {
      // create a file list to be assigned to input
      const list = new DataTransfer();
      list.items.add(new File([imgBlob], fileName, {type: mimeType}));
      fileField.files = list.files;
      // dispatch change event to file input
      fileField.dispatchEvent(new Event('change'));
      importButton.innerText = 'Import';
    } else {
      importButton.innerText = 'Error';
    }
  }
  async function importTags(imageID, booruData) {
    const tagInput = $('#image_tag_input, #tags-form_tag_input, #post_tag_input');
    const fancyEditor = tagInput.classList.contains('hidden');
    const importButton = $(`#${SCRIPT_ID}_tag_import_button`);
    importButton.innerText = 'Loading...';
    // change to plain editor
    if (fancyEditor) {
      // "Plain editor" button
      $('.js-taginput-hide').click();
    }
    // fetch image metadata
    const json = await fetchMeta(imageID, booruData);
    const tags = booruData.bor ? json.post.tags : json.image.tags;
    const fetchedTags = performTagFilter(tags);
    const tagPool = tagsToArray(tagInput.value);
    performTagReplacement(fetchedTags);
    // append tags
    for (const tag of fetchedTags) {
      if (tagPool.includes(tag)) continue;
      tagPool.push(tag);
    }
    performTagCleanUp(tagPool);
    tagInput.value = tagPool.join(', ');
    // revert tag editor
    if (fancyEditor) {
      // "Fancy Editor" button
      $('.js-taginput-show').click();
    }
    importButton.innerText = 'Import tags';
  }
  function progressCallback(response) {
    if (!response.lengthComputable || response.readyState !== 3) return;
    const button = response.context;
    const {loaded, total} = response;
    const percentage = Math.round((loaded / total) * 100);
    button.innerText = `${percentage}%`;
  }

  function initTagImport() {
    const tagsForm = $('#tags-form');
    if (!tagsForm || $(`#${SCRIPT_ID}_tag_import_button`)) return; // tagging disabled or ui already exists
    const field = create('div');
    field.classList.add('field');
    field.classList.add('field--inline');
    const input = create('input');
    input.classList.add('input');
    input.classList.add('input--wide');
    input.id = `${SCRIPT_ID}_tag_import_field`;
    const button = create('button');
    button.classList.add('button');
    button.classList.add('button--separate-left');
    button.type = 'button';
    button.id = `${SCRIPT_ID}_tag_import_button`;
    button.style.width = '120px';
    button.innerText = 'Import tags';
    field.appendChild(input);
    field.appendChild(button);
    button.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const url = input.value.trim();
      const info = getImageInfo(url);
      if (!info) return;
      const {id, booruData} = info;
      importTags(id, booruData);
    });
    $('.field', tagsForm).prepend(field);
  }
  function initImageImport() {
    const scraperInput = $('#image_scraper_url, #scraper_url');
    const importButton = create('button');
    importButton.setAttribute('class', 'button button--separate-left');
    importButton.type = 'button';
    importButton.innerText = 'Import';
    importButton.id = `${SCRIPT_ID}_import_button`;
    importButton.style.width = '100px';
    scraperInput.after(importButton);
    importButton.addEventListener('click', e => {
      e.stopPropagation();
      e.preventDefault();
      const url = scraperInput.value.trim();
      const {id, booruData} = getImageInfo(url);
      if (isSameSite(booruData.booruDomains)) {
        console.error("You can't import images from the same site.");
        return;
      }
      importImage(id, booruData);
    });
  }
  function createMenuItem(text, href, title) {
    const anchor = document.createElement('a');
    anchor.classList.add('header__link');
    anchor.classList.add(`${SCRIPT_ID}_link`);
    anchor.relList.add('noopener');
    anchor.referrerPolicy = 'origin';
    anchor.innerText = text;
    anchor.href = href;
    anchor.title = title;
    return anchor;
  }
  function initUploadList() {
    const {id: imageId, booruData: sourceBooru} = getImageInfo(window.location.href);
    const uploadButton = $(`a.header__link[href="${sourceBooru.uploadPage}"]`);
    if (!QUICK_UPLOAD || !uploadButton) return;
    const dropdown = create('div');
    dropdown.classList.add('dropdown', 'header__dropdown', `${SCRIPT_ID}__menu`);
    const nav = create('nav');
    nav.classList.add('dropdown__content');
    const downCaret = create('i');
    downCaret.classList.add('fa', 'fa-caret-down');
    uploadButton.append(' ', downCaret);
    for (const booru of Object.values(boorus)) {
      const {prettyName, primaryDomain, uploadPage} = booru;
      if (!uploadPage || isSameSite(booru.booruDomains)) continue;
      const sourceUrl = `${sourceBooru.primaryDomain}/${
        sourceBooru.bor ? 'posts' : 'images'
      }/${imageId}`;
      const url = new URL(primaryDomain + uploadPage);
      url.searchParams.append('import_from', sourceUrl);
      nav.append(createMenuItem(prettyName, url.toString(), `Upload this image to ${prettyName}`));
    }
    uploadButton.after(dropdown);
    dropdown.append(uploadButton, nav);
  }
  function autorun() {
    const searchParams = new URLSearchParams(window.location.search);
    const url = searchParams.get('import_from');
    if (!url) return;
    const {id, booruData} = getImageInfo(url);
    importImage(id, booruData);
  }
  function initUI() {
    const content = $('#content'); // the closest parent element that persists after saving tags
    const imageTarget = $('#image_target, .image-target'); // used to check for image page
    const noThumb = $('#thumbnails-not-yet-generated'); // used to check for image page during image processing
    let scraperInput = $('#image_scraper_url, #scraper_url'); // image scraper field
    // runs on image pages
    if (content && (imageTarget || noThumb)) {
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof HTMLElement && node.matches('.js-tagsauce')) {
              initTagImport();
            }
          }
        }
      });
      observer.observe(content, {childList: true});
      initTagImport();
      initUploadList();
    }
    if (!scraperInput && $('form[action="/images"]')) {
      // Ponerpics doesn't have scraper enabled
      const filePicker = $('#image_image');
      const div = create('div');
      div.classList.add('field', 'field--inline');
      scraperInput = create('input');
      scraperInput.classList.add('input', 'input--wide', 'js-scraper');
      scraperInput.id = 'image_scraper_url';
      scraperInput.type = 'url';
      div.append(scraperInput);
      filePicker?.parentElement.after(div);
    }
    // runs on upload page
    // scraper button is also used on reverse search page, filter using form action
    if (scraperInput && scraperInput.closest('form[action="/images"], form[action="/posts"]')) {
      initImageImport();
      autorun();
    }
  }
  initUI();
})();
