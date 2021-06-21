import {boorus, SCRIPT_ID, QUICK_UPLOAD} from './const';
import {$, create, getImageInfo, isSameSite} from './util';
import {importImage, importTags} from './import';

function initTagImport(): void {
  const tagsForm = $('#tags-form');

  if (!tagsForm || $(`#${SCRIPT_ID}_tag_import_button`)) return;  // tagging disabled or ui already exists

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

function initImageImport(): void {
  const scraperInput = $<HTMLInputElement>('#image_scraper_url, #scraper_url');
  const importButton = create('button');
  importButton.setAttribute('class', 'button button--separate-left');
  importButton.type = 'button';
  importButton.innerText = 'Import';
  importButton.id = `${SCRIPT_ID}_import_button`;
  importButton.style.width = '100px';
  scraperInput.after(importButton);

  importButton.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();

    const url = scraperInput.value.trim();
    const {id, booruData} = getImageInfo(url);

    if (isSameSite(booruData.booruDomains)) {
      console.error('You can\'t import images from the same site.');
      return;
    }
    importImage(id, booruData);
  });
}

function createMenuItem(text: string, href: string, title?: string): HTMLAnchorElement {
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

function initUploadList(): void {
  const {id: imageId, booruData: sourceBooru} = getImageInfo(window.location.href);
  const uploadButton = $<HTMLAnchorElement>(`a.header__link[href="${sourceBooru.uploadPage}"]`);
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
    const sourceUrl = `${sourceBooru.primaryDomain}/${(sourceBooru.bor) ? 'posts' : 'images'}/${imageId}`;
    const url = new URL(primaryDomain + uploadPage);
    url.searchParams.append('import_from', sourceUrl);
    nav.append(createMenuItem(
      prettyName,
      url.toString(),
      `Upload this image to ${prettyName}`,
    ));
  }

  uploadButton.after(dropdown);
  dropdown.append(uploadButton, nav);
}

function autorun(): void {
  const searchParams = new URLSearchParams(window.location.search);
  const url = searchParams.get('import_from');
  if (!url) return;

  const {id, booruData} = getImageInfo(url);
  importImage(id, booruData);
}

function initUI(): void {
  const content = $('#content');                      // the closest parent element that persists after saving tags
  const imageTarget = $('#image_target');             // used to check for image page
  const noThumb = $('#thumbnails-not-yet-generated'); // used to check for image page during image processing

  let scraperInput = $<HTMLInputElement>('#image_scraper_url, #scraper_url'); // image scraper field

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
