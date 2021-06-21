import {$, create} from './util/common';

const SCRIPT_ID = 'image_importer';
const boorus: Boorus = {
  derpibooru: {
    primaryDomain: 'https://derpibooru.org',
    prettyName: 'Derpibooru',
    booruDomains: ['derpibooru.org', 'trixiebooru.org', 'ronxgr5zb4dkwdpt.onion'],
    cdnDomains: ['derpicdn.net'],
    uploadPage: '/images/new',
  },
  ponybooru: {
    primaryDomain: 'https://ponybooru.org',
    prettyName: 'Ponybooru',
    booruDomains: ['ponybooru.org'],
    cdnDomains: ['cdn.ponybooru.org'],
    uploadPage: '/images/new',
    importTag: siteName => `${siteName} import`,
  },
  ponerpics: {
    primaryDomain: 'https://ponerpics.org',
    prettyName: 'Ponerpics',
    booruDomains: ['ponerpics.org', 'ponerpics.com'],
    cdnDomains: ['ponerpics.org', 'ponerpics.com'],
    uploadPage: '/images/new',
    importTag: siteName => `imported from ${siteName}`,
  },
  twibooru: {
    primaryDomain: 'https://twibooru.org',
    prettyName: 'Twibooru',
    booruDomains: ['twibooru.org', 'twibooru.com'],
    cdnDomains: ['cdn.twibooru.org', 'cdn.twibooru.com'],
    uploadPage: '/posts/new',
    importTag: siteName => `${siteName} import`,
    bor: true,
    markdown: true,
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
  'banned from derpibooru',
  'banned tags',
  'changelings in the comments',
  'clopfic in the comments',
  'comments locked down',
  'comments more entertaining',
  'debate in the comments',
  'deleted from derpibooru',
  'derail in the comments',
  'derpibooru exclusive',
  'derpibooru import',
  'discussion in the comments',
  'duckery in the comments',
  'featured image',
  'hfh',
  'image',
  'imported from derpibooru',
  'imported from manebooru',
  'imported from ponerpics',
  'imported from ponybooru',
  'imported from twibooru',
  'index get',
  'jpeg',
  'manebooru exclusive',
  'manebooru original',
  'paste',
  'png',
  'politics in the comments',
  'ponerpics exclusive',
  'ponerpics import',
  'ponibooru import',
  'ponybooru exclusive',
  'ponybooru import',
  'shipping war in the comments',
  'song in the comments',
  'story in the comments',
  'translated in the comments',
  'twibooru exclusive',
  'twibooru import',
];

const config = ConfigManager(
  'Philomena Image Importer',
  SCRIPT_ID,
  'Import image and tags from Philomena-based boorus.'
);
config.registerSetting({
  title: 'Quick upload',
  key: 'quick_upload',
  description: 'Turn the upload button into a dropdown menu for uploading current image to other sites.',
  type: 'checkbox',
  defaultValue: true
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
tagFieldset.registerSetting({
  title: 'Add "import" tag',
  key: 'indicate_import_tag',
  description: 'Add a "<site> import" tag for sites with a standardized tagging convention for imported images',
  type: 'checkbox',
  defaultValue: true
});
tagFieldset.registerSetting({
  title: 'Subscribe to default filter',
  key: 'sub_default',
  description: 'Filter tags from the default list in addition to the user defined tags. The list stays current with script updates.',
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

const QUICK_UPLOAD = config.getEntry('quick_upload') as boolean;
const LINK_FIX = config.getEntry('link_fix') as boolean;
const ORIGIN_SOURCE = config.getEntry('origin_source') as boolean;
const INDICATE_IMPORT = config.getEntry('indicate_import') as boolean;
const ORIG_UPLOAD_DATE = config.getEntry('orig_upload_date') as boolean;
const ORIG_UPLOADER = config.getEntry('orig_uploader') as boolean;
const TAG_FILTER = config.getEntry('tag_filter') as boolean;
const INDICATE_IMPORT_TAG = config.getEntry('indicate_import_tag') as boolean;
const SUB_DEFAULT = config.getEntry('sub_default') as boolean;

/*
 *  Perform coding surgery to change input field into textarea
 */
const oldInput = $('input', tagEntry);
const newText = create('textarea');
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

export {
  SCRIPT_ID,
  boorus,
  DEFAULT_TAG_BLACKLIST,
  config,
  QUICK_UPLOAD,
  LINK_FIX,
  ORIGIN_SOURCE,
  INDICATE_IMPORT,
  ORIG_UPLOAD_DATE,
  ORIG_UPLOADER,
  TAG_FILTER,
  INDICATE_IMPORT_TAG,
  SUB_DEFAULT,
};
