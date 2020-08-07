// ==UserScript==
// @name         Derpibooru Image Importer
// @description  Import image and tags from Philomena-based boorus
// @version      1.5.4
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
  'banned tags',
  'changelings in the comments',
  'clopfic in the comments',
  'comments locked down',
  'comments more entertaining',
  'debate in the comments',
  'derail in the comments',
  'derpibooru exclusive',
  'derpibooru import',
  'discussion in the comments',
  'duckery in the comments',
  'featured image',
  'index get',
  'manebooru exclusive',
  'politics in the comments',
  'ponerpics exclusive',
  'ponibooru exclusive',
  'ponybooru exclusive',
  'shipping war in the comments',
  'song in the comments',
  'story in the comments',
  'translated in the comments',
  'twibooru exclusive',
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

  // booru-on-rail doesn't accept filenames without extension
  const fileName = (/\.(?:jpg|jpeg|png|gif|webm|mp4)$/i).test(name)
    ? name
    : name + '.' + ext;

  // special case for svg uploads
  const fileURL = (mimeType !== 'image/svg+xml')
    ? metadata.representations.full
    : metadata.representations.full.replace('/view/', /download/).replace(/\.\w+$/, '.svg');

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
  const newTags = performTagFilter(tags);
  performTagCleanUp(newTags);
  tagInput.value = newTags.join(', ');

  // add description
  $('#image_description').value = processDescription(description, imageID, booruData, metadata);

  // revert tag editor
  if (fancyEditor) {
    // "Fancy Editor" button
    $('.js-taginput-show').click();
  }

  // fetch full image
  const fileField = $('#image_image');
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
  const tagInput = $('#image_tag_input');
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
    const {created_at, uploader} = imgJson;
    let msg = `"[Imported from ${prettyName}]":${primaryDomain}/images/${imageID}`;
    if (ORIG_UPLOAD_DATE) msg += `\nOriginal upload date: ${created_at}`;
    if (ORIG_UPLOADER) msg += `\nOriginal uploader: ${(uploader) ? uploader : 'Anonymous'}`;

    desc = emptyDesc ? msg
      : msg
        + '\n@==---------------==@\n\n'
        + desc;
  }

  return desc;
}

function fetchMeta(imageID, booruData) {
  const {primaryDomain} = booruData;
  const requestURL = (booruData.bor)
    ? `${primaryDomain}/images/${imageID}.json`
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
    const filtered_tags = tagsToArray(config.getEntry('tag_blacklist'));
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
  replaceTag(tagPool, 'unofficial characters only', 'oc only');
  replaceTag(tagPool, 'glow-in-the-dark', 'glow in the dark');
  replaceTag(tagPool, 'unauthorized edit', 'edit');
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

initUI();
})();
