import {SCRIPT_ID} from './const';
import {$, create, getImageInfo} from './util';
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
    const {id, booruData} = getImageInfo(url);
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

    importImage(id, booruData);
  });
}

function initUI(): void {
  const content = $('#content');                      // the closest parent element that persists after saving tags
  const imageTarget = $('#image_target');             // used to check for image page
  const noThumb = $('#thumbnails-not-yet-generated'); // used to check for image page during image processing

  let scraperInput = $<HTMLInputElement>('#image_scraper_url, #scraper_url'); // image scraper field

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

  // scraper button is also used on reverse search page, filter using form action
  if (scraperInput && scraperInput.closest('form[action="/images"], form[action="/posts"]')) {
    initImageImport();
  }
}

initUI();
