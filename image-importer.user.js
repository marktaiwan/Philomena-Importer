// ==UserScript==
// @name         Derpibooru Image Importer
// @description  Import image and tags from Philomena-based boorus
// @version      1.3.2
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Importer
// @supportURL   https://github.com/marktaiwan/Philomena-Importer/issues
//
// @match        *://*.derpibooru.org/*
// @match        *://*.trixiebooru.org/*
// @match        *://*.ponybooru.org/*
// @match        *://*.ponerpics.org/*
//
// @connect      derpibooru.org
// @connect      derpicdn.net
// @connect      ponybooru.org
// @connect      ponerpics.org
//
// @inject-into  content
// @grant        GM_xmlhttpRequest
// @noframes
// @require      https://github.com/marktaiwan/Derpibooru-Unified-Userscript-Ui/raw/master/derpi-four-u.js?v1.2.2
// ==/UserScript==

(function () {
'use strict';

const SCRIPT_ID = 'image_importer';
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
  'comments locked down',
  'comments more entertaining',
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

const LINK_FIX = config.getEntry('link_fix');
const ORIGIN_SOURCE = config.getEntry('origin_source');
const INDICATE_IMPORT = config.getEntry('indicate_import');
const ORIG_UPLOAD_DATE = config.getEntry('orig_upload_date');
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
  const importButton = $(`#${SCRIPT_ID}_import_button`);
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
  tagInput.value = performTagFilter(tags).join(', ');

  // add description
  $('#image_description').value = processDescription(description, imageID, booruData, json.image);

  // revert tag editor
  if (fancyEditor) {
    // "Fancy Editor" button
    $('.js-taginput-show').click();
  }

  // fetch full image
  const fileField = $('#image_image');
  const imgBlob = await makeRequest(
    fileURL,
    'blob',
    progressCallback,
    importButton
  ).then(resp => resp.response);

  // create a file list to be assigned to input
  const list = new DataTransfer();
  list.items.add(new File([imgBlob], fileName, {type: mimeType}));

  fileField.files = list.files;

  // dispatch change event to file input
  fileField.dispatchEvent(new Event('change'));

  importButton.innerText = 'Import';
}

async function importTags(imageID, booruData) {
  const tagInput = $('#image_tag_input');
  const {primaryDomain} = booruData;
  const fancyEditor = tagInput.classList.contains('hidden');
  const importButton = $(`#${SCRIPT_ID}_tag_import_button`);
  importButton.innerText = 'Loading...';

  // change to plain editor
  if (fancyEditor) {
    // "Plain editor" button
    $('.js-taginput-hide').click();
  }

  // fetch image metadata
  const json = await makeRequest(`${primaryDomain}/api/v1/json/images/` + imageID).then(resp => JSON.parse(resp.responseText));
  const fetchedTags = performTagFilter(json.image.tags);
  const tagPool = tagInput.value
    .split(',')
    .map(tag => tag.trim());

  // append tags
  for (const tag of fetchedTags) {
    if (tagPool.includes(tag)) continue;
    tagPool.push(tag);
  }

  // tag cleaning
  conditionalTagRemoval(tagPool, tagPool.some(tag => tag.startsWith('artist:')), 'artist needed');
  conditionalTagRemoval(tagPool, tagPool.some(tag => tag.startsWith('oc:')), 'unknown oc');

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

  if (!tagsForm) return;  // tagging disabled

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

  $('.field>label:first-child', tagsForm).after(field);
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

    const input = $('#image_scraper_url');
    const url = input.value.trim();
    const {id, booruData} = getImageInfo(url);

    importImage(id, booruData);
  });
}

function initUI(){
  const content = $('#content');                  // the closest parent element that persists after saving tags
  const imageTarget = $('#image_target');         // used to check for image page
  const fetchButton = $('#js-scraper-preview');   // image scraper button

  if (content && imageTarget) {
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
  if (fetchButton && fetchButton.closest('form[action="/images"]')) {
    initImageImport();
  }
}

function processDescription(originalDescription, imageID, booruData, imgJson) {
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
    let msg = `"[Imported from ${prettyName}]":${primaryDomain}/images/${imageID}`;
    if (ORIG_UPLOAD_DATE) msg += `\nOriginal upload date: ${imgJson.created_at}`;

    desc = emptyDesc ? msg
      : msg
        + '\n@==---------------==@\n\n'
        + desc;
  }

  return desc;
}

function makeRequest(url, responseType = 'text', onprogress, button) {
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

function performTagFilter(tagList) {
  if (TAG_FILTER) {
    const filtered_tags = config.getEntry('tag_blacklist')
      .split(',')
      .map(tag => tag.trim());
    return tagList.filter(tag => !filtered_tags.includes(tag));
  } else {
    return tagList;
  }
}

function conditionalTagRemoval(tagPool, condition, tagToRemove) {
  if (condition) {
    const tagIndex = tagPool.findIndex(tag => tag == tagToRemove);
    if (tagIndex > -1) tagPool.splice(tagIndex, 1);
  }
}

initUI();
})();
