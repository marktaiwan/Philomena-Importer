import {DEFAULT_TAG_BLACKLIST, config, LINK_FIX, INDICATE_IMPORT,
  ORIG_UPLOAD_DATE, ORIG_UPLOADER, TAG_FILTER, SUB_DEFAULT} from './const';
import {textileToMarkdown, markdownToTextile} from './markupTransform';
import type {Philomena, Twibooru} from '../types/BooruApi';

function processDescription(
  originalDescription: string,
  imageID: string,
  sourceBooruData: BooruRecord,
  targetBooruData: BooruRecord,
  imgJson: Twibooru.Image.ImageObject | Philomena.Image.ImageObject
): string {
  const {primaryDomain, prettyName} = sourceBooruData;
  const emptyDesc = (originalDescription === '');
  const imgPath = (!sourceBooruData.bor) ? 'images' : 'posts';
  let desc = originalDescription;

  if (LINK_FIX && !emptyDesc) {
    if (sourceBooruData.markdown) {
      // image links
      desc = desc.replace(
        /(?:>>(\d+))([pts])?/g,
        (matched, id, postfix) => `[>>[${prettyName}]${[id, postfix].join('')}](${primaryDomain}/${imgPath}/${id})`
      );
    } else {
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
  }

  // Half-assed textile <-> markdown conversion
  if (!emptyDesc || INDICATE_IMPORT) {
    if (targetBooruData.markdown && !sourceBooruData.markdown) desc = textileToMarkdown(desc);
    if (sourceBooruData.markdown && !targetBooruData.markdown) desc = markdownToTextile(desc, primaryDomain);
  }

  if (INDICATE_IMPORT) {
    const created_at = imgJson.created_at;
    const uploader = ('uploader' in imgJson) ? imgJson.uploader : 'Anonymous';
    let msg = (targetBooruData.markdown)
      ? `[[Imported from ${prettyName}]](${primaryDomain}/${imgPath}/${imageID})`
      : `"[Imported from ${prettyName}]":${primaryDomain}/${imgPath}/${imageID}`;

    if (ORIG_UPLOAD_DATE) msg += `\nOriginal upload date: ${created_at}`;
    if (ORIG_UPLOADER) msg += `\nOriginal uploader: ${(uploader) ? uploader : 'Anonymous'}`;

    const divider = (targetBooruData.markdown)
      ? '---'
      : '@==----------------==@';

    desc = emptyDesc
      ? msg
      : msg + `\n\n${divider}\n\n` + desc;
  }

  return desc;
}

function performTagFilter(tagList: string[]): string[] {
  if (!TAG_FILTER) return tagList;

  const userFilter = tagsToArray(config.getEntry('tag_blacklist') as string);
  const filtered_tags = SUB_DEFAULT
    ? [...DEFAULT_TAG_BLACKLIST, ...userFilter]   // Dupes doesn't matter
    : userFilter;

  return tagList.filter(tag => !filtered_tags.includes(tag));
}

function performTagCleanUp(tagPool: string[]): string[] {
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
  replaceTag(tagPool, 'human on filly action', 'human on filly');
  return tagPool;
}

function addTag(tagPool: string[], tagToAdd: string): void {
  if (!tagPool.includes(tagToAdd)) tagPool.push(tagToAdd);
}

function removeTag(tagPool: string[], tagToRemove: string): void {
  const tagIndex = tagPool.findIndex(tag => tag == tagToRemove);
  if (tagIndex > -1) tagPool.splice(tagIndex, 1);
}

function replaceTag(tagPool: string[], oldTag: string, newTag: string): void {
  if (tagPool.includes(oldTag)) {
    removeTag(tagPool, oldTag);
    addTag(tagPool, newTag);
  }
}

function removeNamespace(namespace: string) {
  return (tag: string, index: number, tagPool: string[]): void => {
    if (tag.startsWith(namespace)) tagPool[index] = tag.slice(namespace.length);
  };
}

function tagsToArray(str: string): string[] {
  return str.split(',').map(tag => tag.trim());
}

export {processDescription, performTagFilter, performTagCleanUp, tagsToArray};
