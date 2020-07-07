// ==UserScript==
// @name         Derpibooru Image Importer
// @version      1.2.4
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Importer
// @supportURL   https://github.com/marktaiwan/Philomena-Importer/issues
// @match        *://*.ponybooru.org/images/new
// @match        *://*.ponybooru.org/settings/edit
// @inject-into  content
// @grant        GM_xmlhttpRequest
// @noframes
// @require      https://openuserjs.org/src/libs/mark.taiwangmail.com/Derpibooru_Unified_Userscript_UI_Utility.js?v1.2.2
// ==/UserScript==

(function () {
'use strict';

const origDomain = 'https://derpibooru.org';
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

const config = ConfigManager('Derpibooru Image Importer', 'image_importer');
config.registerSetting({
  title: 'Add import message to description',
  key: 'indicate_import',
  description: 'Prefix the description with a link to the original derpibooru post.',
  type: 'checkbox',
  defaultValue: false
});
config.registerSetting({
  title: 'Link correction',
  key: 'link_fix',
  description: 'Rewrite original on-site links in the description to properly point to Derpibooru.',
  type: 'checkbox',
  defaultValue: true
});
config.registerSetting({
  title: 'Use Derpi as source',
  key: 'derpi_source',
  description: 'Use Derpibooru as source link if the imported image lacks one.',
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

const INDICATE_IMPORT = config.getEntry('indicate_import');
const LINK_FIX = config.getEntry('link_fix');
const DERPI_SOURCE = config.getEntry('derpi_source');
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

async function importImage(imageID) {
  const importButton = $('#derpi_import_button');
  importButton.innerText = 'Loading...';

  // fetch image metadata from Derpi
  const json = await makeRequest('https://derpibooru.org/api/v1/json/images/' + imageID).then(resp => JSON.parse(resp.responseText));
  const fileURL = json.image.representations.full;
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
    : (DERPI_SOURCE)
      ? `${origDomain}/images/${imageID}`
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
  $('#image_description').value = processDescription(description, imageID);

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
  importButton.id = 'derpi_import_button';
  importButton.style.width = '100px';
  fetchButton.insertAdjacentElement('beforebegin', importButton);

  importButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = $('#image_scraper_url');
    const url = input.value.trim();
    importImage(getImageId(url));
  });
}

function processDescription(original, imageID) {
  const emptyDesc = (original === '');
  let desc = original;

  if (LINK_FIX && !emptyDesc) {
    // rewrite in-site links
    desc = desc.replace(
      /(".+?"):(\/)/g,
      (matched, text) => `${text}:${origDomain}/`
    );
    // rewrite image links
    // match image links, turn embeds into links as well.
    desc = desc.replace(
      /(?:>>(\d+))[pts]?/g,
      (matched, id) => `"[==${matched}==]":${origDomain}/images/${id}`
    );
  }

  if (INDICATE_IMPORT) {
    const msg = `"[Imported from Derpibooru]":${origDomain}/images/${imageID}`;
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
      onerror: console.log,
      onprogress
    });
  });
}

function progressCallback(response) {
  if (!response.lengthComputable || response.readyState !== 3) return;

  const button = $('#derpi_import_button');
  const {loaded, total} = response;
  const percentage = Math.round((loaded / total) * 100);

  button.innerText = `${percentage}%`;
}

function getImageId(url) {
  const regex = new RegExp('https?://(?:www\\.)?(?:(?:derpibooru\\.org|trixiebooru\\.org)/(?:images/)?(\\d+)(?:\\?.*|/|\\.html)?|derpicdn\\.net/img/(?:view/|download/)?\\d+/\\d+/\\d+/(\\d+))', 'i');
  const array = url.match(regex);
  return (array !== null) ? array[1] || array[2] : null;
}

initUI();
})();
