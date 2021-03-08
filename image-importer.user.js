// ==UserScript==
// @name         Derpibooru Image Importer
// @description  Import image and tags from Philomena-based boorus
// @version      1.7.4
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Importer
// @supportURL   https://github.com/marktaiwan/Philomena-Importer/issues
//
// @match        *://*.derpibooru.org/*
// @match        *://*.trixiebooru.org/*
// @match        *://*.ronxgr5zb4dkwdpt.onion/*
// @match        *://*.ponybooru.org/*
// @match        *://*.ponerpics.org/*
// @match        *://*.ponerpics.com/*
// @match        *://*.twibooru.org/*
//
// @connect      derpibooru.org
// @connect      derpicdn.net
// @connect      ponybooru.org
// @connect      ponerpics.org
// @connect      ponerpics.com
//
// @inject-into  content
// @grant        GM_xmlhttpRequest
// @noframes
// @require      https://github.com/marktaiwan/Derpibooru-Unified-Userscript-Ui/raw/master/derpi-four-u.js?v1.2.3
// ==/UserScript==

/* global ConfigManager */

(function () {
'use strict';

const SCRIPT_ID = 'image_importer';
const boorus = {
  derpibooru: {
    primaryDomain: 'https://derpibooru.org',
    prettyName: 'Derpibooru',
    booruDomains: ['derpibooru.org', 'trixiebooru.org', 'ronxgr5zb4dkwdpt.onion'],
    cdnDomains: ['derpicdn.net'],
  },
  ponybooru: {
    primaryDomain: 'https://ponybooru.org',
    prettyName: 'Ponybooru',
    booruDomains: ['ponybooru.org'],
    cdnDomains: ['cdn.ponybooru.org'],
  },
  ponerpics: {
    primaryDomain: 'https://ponerpics.org',
    prettyName: 'Ponerpics',
    booruDomains: ['ponerpics.org', 'ponerpics.com'],
    cdnDomains: ['ponerpics.org', 'ponerpics.com'],
  },
  twibooru: {
    primaryDomain: 'https://twibooru.org',
    prettyName: 'Twibooru',
    booruDomains: ['twibooru.org', 'twibooru.com'],
    cdnDomains: ['cdn.twibooru.org', 'cdn.twibooru.com'],
    bor: true,
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
  'imported from derpibooru',
  'imported from manebooru',
  'imported from ponerpics',
  'imported from ponybooru',
  'imported from twibooru',
  'index get',
  'jpeg',
  'manebooru exclusive',
  'manebooru original',
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
  title: 'Link correction',
  key: 'link_fix',
  description: 'Rewrite on-site links in the description to properly point to the original site.',
  type: 'checkbox',
  defaultValue: true
});
config.registerSetting({
  title: 'Use origin as source',
  key: 'origin_source',
  description: 'Use the original post as source link if the imported image lacks one.',
  type: 'checkbox',
  defaultValue: false
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
  defaultValue: false
});
descFieldset.registerSetting({
  title: 'Include original upload date',
  key: 'orig_upload_date',
  type: 'checkbox',
  defaultValue: false
});
descFieldset.registerSetting({
  title: 'Include original uploader',
  key: 'orig_uploader',
  type: 'checkbox',
  defaultValue: false
});
const tagFieldset = config.addFieldset(
  'Tag Filtering',
  'tag_filtering'
);
tagFieldset.registerSetting({
  title: 'Enable tag filtering',
  key: 'tag_filter',
  type: 'checkbox',
  defaultValue: true
});
tagFieldset.registerSetting({
  title: 'Subscribe to default filter',
  key: 'sub_default',
  description: 'Filter tags from the default list in addition to the user defined tags. The list stays current with script updates.',
  type: 'checkbox',
  defaultValue: true
});
const tagEntry = tagFieldset.registerSetting({
  title: 'Remove these tags:',
  key: 'tag_blacklist',
  description: 'These tags will be removed during import. Comma separated.',
  type: 'text',
  defaultValue: DEFAULT_TAG_BLACKLIST.join(', ')
});

const LINK_FIX = config.getEntry('link_fix');
const ORIGIN_SOURCE = config.getEntry('origin_source');
const INDICATE_IMPORT = config.getEntry('indicate_import');
const ORIG_UPLOAD_DATE = config.getEntry('orig_upload_date');
const ORIG_UPLOADER = config.getEntry('orig_uploader');
const TAG_FILTER = config.getEntry('tag_filter');
const SUB_DEFAULT = config.getEntry('sub_default');

/*
 *  Perform coding surgery to change input field into textarea
 */
const oldInput = $('input', tagEntry);
const newText = document.createElement('textarea');
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


function $(selector, parent = document) {
  return parent.querySelector(selector);
}

async function importImage(imageID, booruData) {
  const makeAbsolute = (path, domain) => path.match(/^(?:https?:)?\/\//) ? path : domain + path;

  const {primaryDomain} = booruData;
  const importButton = $(`#${SCRIPT_ID}_import_button`);
  importButton.innerText = 'Loading...';

  // fetch image metadata
  const json = await fetchMeta(imageID, booruData);
  const metadata = (booruData.bor) ? json : json.image;
  const {description, mime_type: mimeType, source_url: source} = metadata;

  // handle differences in response between booru-on-rails and philomena
  const tags = (booruData.bor) ? tagsToArray(metadata.tags) : metadata.tags;
  const name = (booruData.bor) ? metadata.file_name : metadata.name;
  const ext = (booruData.bor) ? metadata.original_format : metadata.format;
  const imgPath = (booruData.bor) ? 'posts' : 'images';

  // booru-on-rail doesn't accept filenames without extension
  const fileName = (/\.(?:jpg|jpeg|png|gif|webm|mp4)$/i).test(name)
    ? name
    : name + '.' + ext;

  // special case for svg uploads
  const fileURL = (mimeType !== 'image/svg+xml')
    ? metadata.representations.full
    : metadata.representations.full.replace('/view/', /download/).replace(/\.\w+$/, '.svg');

  const tagInput = $('#image_tag_input, #tags-form_tag_input, #post_tag_input');
  const fancyEditor = tagInput.classList.contains('hidden');

  // change to plain editor
  if (fancyEditor) {
    // "Plain editor" button
    $('.js-taginput-hide').click();
  }

  // add source
  $('#image_source_url, #post_source_url').value = (source)
    ? source
    : (ORIGIN_SOURCE)
      ? `${primaryDomain}/${imgPath}/${imageID}`
      : '';

  // add tags
  const newTags = performTagFilter(tags);
  performTagCleanUp(newTags);
  tagInput.value = newTags.join(', ');

  // add description
  $('#image_description, #image_description, #post_description').value = processDescription(description, imageID, booruData, metadata);

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
  ).then(resp => (resp.status == 200) ? resp.response : null);

  if (imgBlob !== null) {
    // create a file list to be assigned to input
    const list = new DataTransfer();
    list.items.add(new File([imgBlob], fileName, {type: mimeType}));

    fileField.files = list.files;

    // dispatch change event to file input
    fileField.dispatchEvent(new Event('change'));
  } else {
    importButton.innerText = 'Error';
  }

  importButton.innerText = 'Import';
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

  // booru-on-rails returns the tags as comma separated string
  const tags = (booruData.bor) ? tagsToArray(json.tags) : json.image.tags;
  const fetchedTags = performTagFilter(tags);
  const tagPool = tagsToArray(tagInput.value);

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

function initTagImport() {
  const tagsForm = $('#tags-form');

  if (!tagsForm || $(`#${SCRIPT_ID}_tag_import_button`)) return;  // tagging disabled or ui already exists

  const field = document.createElement('div');
  field.classList.add('field');
  field.classList.add('field--inline');

  const input = document.createElement('input');
  input.classList.add('input');
  input.classList.add('input--wide');
  input.id = `${SCRIPT_ID}_tag_import_field`;

  const button = document.createElement('button');
  button.classList.add('button');
  button.classList.add('button--separate-left');
  button.type = 'button';
  button.id = `${SCRIPT_ID}_tag_import_button`;
  button.style.width = '120px';
  button.innerText = 'Import tags';

  field.appendChild(input);
  field.appendChild(button);

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const url = input.value.trim();
    const {id, booruData} = getImageInfo(url);
    importTags(id, booruData);
  });

  $('.field', tagsForm).prepend(field);
}

function initImageImport() {
  const fetchButton = $('#js-scraper-preview');
  const importButton = document.createElement('button');

  importButton.setAttribute('class', 'button button--separate-left');
  importButton.type = 'button';
  importButton.innerText = 'Import';
  importButton.id = `${SCRIPT_ID}_import_button`;
  importButton.style.width = '100px';
  fetchButton.insertAdjacentElement('beforebegin', importButton);

  importButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = $('#image_scraper_url, #scraper_url');
    const url = input.value.trim();
    const {id, booruData} = getImageInfo(url);

    importImage(id, booruData);
  });
}

function initUI(){
  const content = $('#content');                      // the closest parent element that persists after saving tags
  const imageTarget = $('#image_target');             // used to check for image page
  const noThumb = $('#thumbnails-not-yet-generated'); // used to check for image page during image processing
  const fetchButton = $('#js-scraper-preview');       // image scraper button

  if (content && (imageTarget || noThumb)) {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.matches('.js-tagsauce')) {
            initTagImport();
          }
        }
      }
    });
    observer.observe(content, {childList: true});
    initTagImport();
  }

  // scraper button is also used on reverse serach page, filter using form action
  if (fetchButton && fetchButton.closest('form[action="/images"], form[action="/posts"]')) {
    initImageImport();
  }
}

function processDescription(originalDescription, imageID, sourceBooruData, imgJson) {
  const {booru: targetBooruData} = matchDomain(window.location.host);
  const {primaryDomain, prettyName} = sourceBooruData;
  const emptyDesc = (originalDescription === '');
  const imgPath = (!sourceBooruData.bor) ? 'images' : 'posts';
  let desc = originalDescription;

  if (LINK_FIX && !emptyDesc) {
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
      (matched, id, postfix) => `">>[${prettyName}]${[id, postfix].join('')}":${primaryDomain}/${imgPath}/${id}`
    );
  }

  if (INDICATE_IMPORT) {
    const {created_at, uploader} = imgJson;
    let msg = `"[Imported from ${prettyName}]":${primaryDomain}/${imgPath}/${imageID}`;
    if (ORIG_UPLOAD_DATE) msg += `\nOriginal upload date: ${created_at}`;
    if (ORIG_UPLOADER) msg += `\nOriginal uploader: ${(uploader) ? uploader : 'Anonymous'}`;

    const divider = (targetBooruData.markdown) ? '<!hr!>' : '@==----------------==@';
    desc = emptyDesc ? msg
      : msg
        + `\n${divider}\n\n`
        + desc;
  }

  // Half-assed textile -> markdown conversion for Twibooru
  if (!emptyDesc && targetBooruData.markdown && !sourceBooruData.markdown) {
    desc = textileToMarkdown(desc);
  }

  return desc;
}

function fetchMeta(imageID, booruData) {
  const {primaryDomain} = booruData;
  const requestURL = (booruData.bor)
    ? `${primaryDomain}/posts/${imageID}.json`
    : `${primaryDomain}/api/v1/json/images/` + imageID;
  return makeRequest(requestURL).then(resp => resp.response);
}

function makeRequest(url, responseType = 'json', onprogress, button) {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      context: button,
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType,
      onload: resolve,
      onerror: (e) => {
        e.context.innerText = 'Error';
        console.log(e);
      },
      onprogress
    });
  });
}

function progressCallback(response) {
  if (!response.lengthComputable || response.readyState !== 3) return;

  const button = response.context;
  const {loaded, total} = response;
  const percentage = Math.round((loaded / total) * 100);

  button.innerText = `${percentage}%`;
}

function getImageInfo(url) {
  try {
    const domainRegexStr = concatDomains(boorus, 'booruDomains');
    const cdnRegexStr = concatDomains(boorus, 'cdnDomains');
    const regex = new RegExp(
      'https?://(?:www\\.)?(?:' +
        `(?<domain>${domainRegexStr})/(?:images/|posts/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?|` +
        `(?<cdn>${cdnRegexStr})/img/(?:view/|download/)?\\d+/\\d+/\\d+/(?<cdnID>\\d+)` +
      ')', 'i');

    const result = regex.exec(url);
    if (result === null) {
      throw Error('no_match');
    }

    const {domain, cdn, domID, cdnID} = result.groups;
    const matchedDomain = domain || cdn;
    const booruData = getDomainInfo(matchedDomain);
    const id = domID || cdnID;

    return {id, booruData};
  } catch (exception) {
    if (exception.message === 'no_match') {
      console.error('Failed to match input URL.');
    } else if (exception.message === 'same_site') {
      console.error('You can\'t import images from the same site. Moron.');
    }
    throw exception;
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

function matchDomain(domain) {
  for (const booru of Object.values(boorus)) {
    const validDomains = [...booru.booruDomains, ...booru.cdnDomains];
    if (validDomains.includes(domain)) {
      return {booru, validDomains};
    }
  }
}

function getDomainInfo(domain) {
  const {booru, validDomains} = matchDomain(domain);
  if (validDomains.includes(window.location.host)) {
    throw Error('same_site');
  }
  return booru;
}

function performTagFilter(tagList) {
  if (TAG_FILTER) {
    const userFilter = tagsToArray(config.getEntry('tag_blacklist'));
    const filtered_tags = SUB_DEFAULT
      ? [...DEFAULT_TAG_BLACKLIST, ...userFilter]   // Dupes doesn't matter
      : userFilter;
    return tagList.filter(tag => !filtered_tags.includes(tag));
  } else {
    return tagList;
  }
}

function performTagCleanUp(tagPool) {
  if (tagPool.some(tag => tag.startsWith('artist:'))) removeTag(tagPool, 'artist needed');
  if (tagPool.some(tag => tag.startsWith('oc:'))) removeTag(tagPool, 'unknown oc');
  if (tagPool.some(tag => tag.startsWith('ponified:'))) {
    tagPool.forEach(removeNamespace('ponified:'));
    addTag(tagPool, 'ponified');
  }
  tagPool.forEach(removeNamespace('species:'));
  tagPool.forEach(removeNamespace('character:'));
  replaceTag(tagPool, 'unofficial characters only', 'oc only');
  replaceTag(tagPool, 'glow-in-the-dark', 'glow in the dark');
  replaceTag(tagPool, 'unauthorized edit', 'edit');
  replaceTag(tagPool, 'pony pussy', 'anatomically correct');
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

function textileToMarkdown(text) {
  const escapeRegExp = str => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  function textileRegExpMaker(open, close, flag) {
    open = escapeRegExp(open);
    close = escapeRegExp(close);
    return new RegExp(
      `(?<![a-zA-Z0-9])${open}(\\S(?:.*\\S)??)${close}(?![a-zA-Z0-9])`
      + '|'
      + `\\[${open}(?!\\*\\])((?:.|\\n)+?)${close}\\]`,
      flag);
  }
  function convertQuotes(text) {
    const splitAtToken = (str, tokenLength, index) => [str.slice(0, index), str.slice(index + tokenLength)];
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
            if (splitRight == '' ) lines.push({nestLevel, content: ''});
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
    // the nest level of each line until encountering 0,
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
      ? '>'.repeat(line.nestLevel) + ' ' + line.content
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
    textile.close = textile.close || textile.open;
    markdown.close = markdown.close || markdown.open;
    text = text.replace(
      textileRegExpMaker(textile.open, textile.close, 'g'),
      (matched, p1, p2) => `${markdown.open}${p1 || p2}${markdown.close}`
    );
  }

  // escape > at the beginning of a line
  text = text.replace(/^>/gm, '\\>');

  // <hr>
  text = text.replace('<!hr!>', '\n---');

  // superscript
  text = text.replace(
    textileRegExpMaker('^', '^', 'g'),
    (matched, p1, p2) => (p1 || p2).replace(/\b\w/g, char => '^' + char)
  );

  // quotes
  text = convertQuotes(text);

  return text;
}

initUI();
})();
