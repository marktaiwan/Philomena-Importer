type BooruRecord = {
  primaryDomain: string,
  prettyName: string,
  booruDomains: string[],
  cdnDomains: string[],
  importTag?: (siteName: string) => string,
  bor?: boolean,
  markdown?: boolean,
};

type Boorus = {[name: string]: BooruRecord};
