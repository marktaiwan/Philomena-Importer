// ==UserScript==
// @name         Derpibooru Image Importer
// @description  Import image and tags from Philomena-based boorus
// @version      1.3.1
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Importer
// @supportURL   https://github.com/marktaiwan/Philomena-Importer/issues
//
// @match        *://*.derpibooru.org/images/new
// @match        *://*.derpibooru.org/settings/edit
// @match        *://*.trixiebooru.org/images/new
// @match        *://*.trixiebooru.org/settings/edit
//
// @match        *://*.ponybooru.org/images/new
// @match        *://*.ponybooru.org/settings/edit
//
// @match        *://*.ponerpics.org/images/new
// @match        *://*.ponerpics.org/settings/edit
//
// @connect      derpibooru.org
// @connect      derpicdn.net
// @connect      ponybooru.org
// @connect      ponerpics.org
//
// @inject-into  content
// @grant        GM_xmlhttpRequest
// @noframes
// @require      https://openuserjs.org/src/libs/mark.taiwangmail.com/Derpibooru_Unified_Userscript_UI_Utility.js?v1.2.2
// ==/UserScript==

(function () {
'use strict';

const boorus = {
  derpibooru: {
    primaryDomain: 'https://derpibooru.org',
    prettyName: 'Derpibooru',
    booruDomains: ['derpibooru.org', 'trixiebooru.org'],
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
    booruDomains: ['ponerpics.org'],
    cdnDomains: ['ponerpics.org'],
  }
};

const DEFAULT_TAG_BLACKLIST = [
  'adventure in the comments',
  'changelings in the comments',
  'clopfic in the comments',
  'debate in the comments',
  'derail in the comments',
  'discussion in the comments',
  'duckery in the comments',
  'featured image',
  'index get',
  'politics in the comments',
  'shipping war in the comments',
  'song in the comments',
  'story in the comments',
  'translated in the comments',
];

const config = ConfigManager(
  'Philomena Image Importer',
  'image_importer',
  'Import image and tags from Philomena-based boorus.'
);
config.registerSetting({
  title: 'Add import message to description',
  key: 'indicate_import',
  description: 'Prefix the description with a link to the original post.',
  type: 'checkbox',
  defaultValue: false
});
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
const tagEntry = tagFieldset.registerSetting({
  title: 'Remove these tags:',
  key: 'tag_blacklist',
  description: 'These tags will be removed during import. Comma separated.',
  type: 'text',
  defaultValue: DEFAULT_TAG_BLACKLIST.join(', ')
});

// setting migration 1.2.5 -> 1.3.0
if (config.getEntry('derpi_source') !== undefined) {
  config.setEntry('origin_source', config.getEntry('derpi_source'));
  config.deleteEntry('derpi_source');
}

const INDICATE_IMPORT = config.getEntry('indicate_import');
const LINK_FIX = config.getEntry('link_fix');
const ORIGIN_SOURCE = config.getEntry('origin_source');
const TAG_FILTER = config.getEntry('tag_filter');

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
  const importButton = $('#script_import_button');
  importButton.innerText = 'Loading...';

  // fetch image metadata
  const json = await makeRequest(`${primaryDomain}/api/v1/json/images/` + imageID).then(resp => JSON.parse(resp.responseText));
  const fileURL = makeAbsolute(json.image.representations.full, primaryDomain);
  const {description, tags, mime_type: mimeType, source_url: source, name: fileName} = json.image;
  const tagInput = $('#image_tag_input');
  const fancyEditor = tagInput.classList.contains('hidden');

  // change to plain editor
  if (fancyEditor) {
    // "Plain editor" button
    $('.js-taginput-hide').click();
  }

  // add source
  $('#image_source_url').value = (source)
    ? source
    : (ORIGIN_SOURCE)
      ? `${primaryDomain}/images/${imageID}`
      : '';

  // add tags
  let addedTags;
  if (TAG_FILTER) {
    const filtered_tags = config.getEntry('tag_blacklist')
      .split(',')
      .map(tag => tag.trim());
    addedTags = tags.filter(tag => !filtered_tags.includes(tag));
  } else {
    addedTags = tags;
  }
  tagInput.value = addedTags.join(', ');

  // add description
  $('#image_description').value = processDescription(description, imageID, booruData);

  // revert tag editor
  if (fancyEditor) {
    // "Fancy Editor" button
    $('.js-taginput-show').click();
  }

  // fetch full image
  const fileField = $('#image_image');
  const imgBlob = await makeRequest(fileURL, 'blob', progressCallback).then(resp => resp.response);

  // create a file list to be assigned to input
  const list = new DataTransfer();
  list.items.add(new File([imgBlob], fileName, {type: mimeType}));

  fileField.files = list.files;

  // dispatch change event to file input
  fileField.dispatchEvent(new Event('change'));

  importButton.innerText = 'Import';
}

function initUI(){
  const fetchButton = $('#js-scraper-preview');
  if (!fetchButton) return;

  const importButton = document.createElement('button');
  importButton.setAttribute('class', 'button button--separate-left');
  importButton.type = 'button';
  importButton.innerText = 'Import';
  importButton.id = 'script_import_button';
  importButton.style.width = '100px';
  fetchButton.insertAdjacentElement('beforebegin', importButton);

  importButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = $('#image_scraper_url');
    const url = input.value.trim();
    try {
      const {id, booruData} = getImageInfo(url);
      importImage(id, booruData);
    } catch (exception) {
      if (exception.message === 'no_match') {
        console.error('Failed to match input URL.');
      } else if (exception.message === 'same_site') {
        console.error('You can\'t import images from the same site. Moron.');
      } else {
        throw exception;
      }
    }
  });
}

function processDescription(originalDescription, imageID, booruData) {
  const {primaryDomain, prettyName} = booruData;
  const emptyDesc = (originalDescription === '');
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
      /(?:>>(\d+))[pts]?/g,
      (matched, id) => `"[==${matched}==]":${primaryDomain}/images/${id}`
    );
  }

  if (INDICATE_IMPORT) {
    const msg = `"[Imported from ${prettyName}]":${primaryDomain}/images/${imageID}`;
    desc = emptyDesc ? msg : msg + '\n\n' + desc;
  }

  return desc;
}

function makeRequest(url, responseType = 'text', onprogress) {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType,
      onload: resolve,
      onerror: (e) => {
        $('#script_import_button').innerText = 'Error';
        console.log(e);
      },
      onprogress
    });
  });
}

function progressCallback(response) {
  if (!response.lengthComputable || response.readyState !== 3) return;

  const button = $('#script_import_button');
  const {loaded, total} = response;
  const percentage = Math.round((loaded / total) * 100);

  button.innerText = `${percentage}%`;
}

function getImageInfo(url) {
  const domainRegexStr = concatDomains(boorus, 'booruDomains');
  const cdnRegexStr = concatDomains(boorus, 'cdnDomains');
  const regex = new RegExp(
    'https?://(?:www\\.)?(?:' +
      `(?<domain>${domainRegexStr})/(?:images/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?|` +
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
  for (const booru of Object.values(boorus)) {
    const validDomains = [...booru.booruDomains, ...booru.cdnDomains];
    if (validDomains.includes(domain)) {
      if (validDomains.includes(window.location.host)) {
        throw Error('same_site');
      }
      return booru;
    }
  }
}

initUI();
})();
