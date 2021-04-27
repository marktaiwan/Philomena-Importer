import {$, makeAbsolute, matchDomain} from './util';
import {SCRIPT_ID, ORIGIN_SOURCE, INDICATE_IMPORT_TAG} from './const';
import {makeRequest, fetchMeta} from './request';
import {processDescription, tagsToArray, performTagFilter, performTagCleanUp} from './processing';
import type {Philomena, Twibooru} from '../types/BooruApi';

async function importImage(imageID: string, booruData: BooruRecord): Promise<void> {
  const {booru: targetBooruData} = matchDomain(window.location.host);
  const {primaryDomain} = booruData;
  const importButton = $(`#${SCRIPT_ID}_import_button`);
  importButton.innerText = 'Loading...';

  // fetch image metadata
  const json = await fetchMeta(imageID, booruData);
  const metadata = (booruData.bor) ? json as Twibooru.Api.Image : json.image as Philomena.Image.ImageObject;
  const {description, mime_type: mimeType, source_url: source} = metadata;

  // handle differences in response between booru-on-rails and philomena
  const tags = (booruData.bor) ? tagsToArray((metadata as Twibooru.Api.Image).tags) : (metadata as Philomena.Image.ImageObject).tags;
  const name = (booruData.bor) ? (metadata as Twibooru.Api.Image).file_name : (metadata as Philomena.Image.ImageObject).name;
  const ext = (booruData.bor) ? (metadata as Twibooru.Api.Image).original_format : (metadata as Philomena.Image.ImageObject).format;
  const imgPath = (booruData.bor) ? 'posts' : 'images';

  // booru-on-rail doesn't accept filenames without extension
  const fileName = (/\.(?:jpg|jpeg|png|gif|webm|mp4)$/i).test(name)
    ? name
    : name + '.' + ext;

  // special case for svg uploads
  const fileURL = (mimeType !== 'image/svg+xml')
    ? metadata.representations.full
    : metadata.representations.full.replace('/view/', '/download/').replace(/\.\w+$/, '.svg');

  // #image_tag_input: Ponerpics
  // #tags-form_tag_input: Derpibooru, Ponybooru
  // #post_tag_input: Twibooru
  const tagInput = $<HTMLTextAreaElement>('#image_tag_input, #tags-form_tag_input, #post_tag_input');
  const fancyEditor = tagInput.classList.contains('hidden');

  // change to plain editor
  if (fancyEditor) {
    // "Plain editor" button
    $('.js-taginput-hide').click();
  }

  // add source
  $<HTMLInputElement>('#image_source_url, #post_source_url').value = (source)
    ? source
    : (ORIGIN_SOURCE)
      ? `${primaryDomain}/${imgPath}/${imageID}`
      : '';

  // add tags
  const newTags = performTagFilter(tags);
  performTagCleanUp(newTags);
  if (INDICATE_IMPORT_TAG && targetBooruData.importTag) {
    // site has a standardized tagging convention for imported images
    const sourceName = booruData.prettyName.toLowerCase();
    newTags.push(targetBooruData.importTag(sourceName));
  }
  tagInput.value = newTags.join(', ');

  // add description
  $<HTMLTextAreaElement>('#image_description, #image_description, #post_description').value = processDescription(
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
  const fileField = $<HTMLInputElement>('#image_image, #post_file');
  const imgBlob: Blob = await makeRequest(
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

async function importTags(imageID: string, booruData: BooruRecord): Promise<void> {
  const tagInput = $<HTMLInputElement>('#image_tag_input, #tags-form_tag_input, #post_tag_input');
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
  const tags = (booruData.bor) ? tagsToArray((json as Twibooru.Api.Image).tags) : (json as Philomena.Api.Image).image.tags;
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

function progressCallback(response: GM_Types.XHRProgress<HTMLElement>): void {
  if (!response.lengthComputable || response.readyState !== 3) return;

  const button = response.context;
  const {loaded, total} = response;
  const percentage = Math.round((loaded / total) * 100);

  button.innerText = `${percentage}%`;
}

export {importImage, importTags};
