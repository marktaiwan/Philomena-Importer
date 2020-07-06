// ==UserScript==
// @name         Derpibooru Image Importer
// @version      1.1.1
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

const DEFAULT_TAG_BLACKLIST = [
  'adventure in the comments',
  'changelings in the comments',
  'clopfic in the comments',
  'debate in the comments',
  'derail in the comments',
  'discussion in the comments',
  'duckery in the comments',
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
  const importButton = $('#derpi_inport_button');
  importButton.innerText = 'Loading...';

  // fetch image metadata from Derpi
  const json = await fetchImageData(`https://derpibooru.org/api/v1/json/images/${imageID}`);
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
  $('#image_source_url').value = source;

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
  let msg = '';
  if (INDICATE_IMPORT) {
    msg = `"[Imported from Derpibooru]":https://derpibooru.org/images/${imageID}`;
    if (description !== '') msg += '\n\n';
  }
  $('#image_description').value = msg + description;

  // fetch full image
  const fileField = $('#image_image');
  const imgBlob = await fetchImage(fileURL);

  // create a file list to be assigned to input
  const list = new DataTransfer();
  list.items.add(new File([imgBlob], fileName, {type: mimeType}));

  fileField.files = list.files;

  // dispatch change event to file input
  fileField.dispatchEvent(new Event('change'));

  // revert tag editor
  if (fancyEditor) {
    // "Fancy Editor" button
    $('.js-taginput-show').click();
  }

  importButton.innerText = 'Import from Derpi';
}

function initUI(){
  const fetchButton = $('#js-scraper-preview');
  if (!fetchButton) return;

  const importButton = document.createElement('button');
  importButton.setAttribute('class', 'button button--separate-left');
  importButton.type = 'button';
  importButton.innerText = 'Import from Derpi';
  importButton.id = 'derpi_inport_button';
  fetchButton.parentElement.append(importButton);

  importButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const input = $('#image_scraper_url');
    const url = input.value.trim();
    importImage(getImageId(url));
  });
}

function fetchImageData(url) {
  return new Promise((resolve) => {
    GM_xmlhttpRequest({
      url: url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      onload: (resp) => resolve(JSON.parse(resp.responseText)),
      onerror: console.log
    });
  });
}

function fetchImage(fileURL) {
  return new Promise((resolve => {
    GM_xmlhttpRequest({
      url: fileURL,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType: 'blob',
      onload: (resp) => resolve(resp.response),
      onerror: console.log
    });
  }));
}

function getImageId(url) {
  const regex = new RegExp('https?://(?:www\\.)?(?:(?:derpibooru\\.org|trixiebooru\\.org)/(?:images/)?(\\d+)(?:\\?.*|/|\\.html)?|derpicdn\\.net/img/(?:view/|download/)?\\d+/\\d+/\\d+/(\\d+))', 'i');
  const array = url.match(regex);
  return (array !== null) ? array[1] || array[2] : null;
}

initUI();
})();
