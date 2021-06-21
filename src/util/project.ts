import {boorus} from '../const';
import {escapeRegExp} from './common';

function getImageInfo(url: string): {id: string, booruData: BooruRecord} {
  const domainRegexStr = concatDomains(boorus, 'booruDomains');
  const cdnRegexStr = concatDomains(boorus, 'cdnDomains');
  const regex = new RegExp(
    'https?://(?:www\\.)?(?:' +
    `(?<domain>${domainRegexStr})/(?:images/|posts/)?(?<domID>\\d+)(?:\\?.*|/|\\.html)?|` +
    `(?<cdn>${cdnRegexStr})/img/(?:view/|download/)?\\d+/\\d+/\\d+/(?<cdnID>\\d+)` +
    ')', 'i');

  const result = regex.exec(url);
  if (result === null) {
    console.error('Failed to match input URL.');
    return;
  }

  const {domain, cdn, domID, cdnID} = result.groups;
  const id = domID || cdnID;
  const matchedDomain = domain || cdn;
  const booruData = getDomainInfo(matchedDomain);

  return {id, booruData};
}

function matchDomain(domain: string): {booru: BooruRecord, validDomains: string[]} {
  for (const booru of Object.values(boorus)) {
    const validDomains = [...booru.booruDomains, ...booru.cdnDomains];
    if (validDomains.some(validDomain => RegExp(`${escapeRegExp(validDomain)}$`, 'i').test(domain))) {
      return {booru, validDomains};
    }
  }
}

function concatDomains(boorus: Boorus, prop: 'booruDomains' | 'cdnDomains'): string {
  const arr = [];
  for (const booru of Object.values(boorus)) {
    for (const domain of booru[prop]) {
      const regexStr = domain.replace(/\./g, '\\.');
      arr.push(regexStr);
    }
  }
  return arr.join('|');
}

function getDomainInfo(domain: string): BooruRecord {
  const {booru} = matchDomain(domain);
  return booru;
}

function isSameSite(domainlist: string[]): boolean {
  return domainlist.includes(window.location.host);
}

export {getImageInfo, getDomainInfo, isSameSite};
