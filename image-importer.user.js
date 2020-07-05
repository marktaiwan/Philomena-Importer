// ==UserScript==
// @name         Derpibooru Image Importer
// @version      1.0.0
// @author       Marker
// @license      MIT
// @namespace    https://github.com/marktaiwan/
// @homepageURL  https://github.com/marktaiwan/Philomena-Image-Data-Copier
// @supportURL   https://github.com/marktaiwan/Derpibooru-Image-Preloader/issues
// @match        https://ponybooru.org/images/new
// @inject-into  content
// @grant        GM_xmlhttpRequest
// @noframes
// ==/UserScript==

(function () {
'use strict';

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
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
  tagInput.value = tags.join(', ');

  // add file url
  // $('#image_scraper_url').value = fileURL;

  // add description
  $('#image_description').value = description;

  // click the fetch button
  // window.requestAnimationFrame(() => {
  //   $('#js-scraper-preview').click();
  // });

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
      // onerror: (e) => console.log('We made a fucky wucky')
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
