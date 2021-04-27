/* Shorthands  */

type SelectorRoot = Document | HTMLElement;

function $<K extends keyof HTMLElementTagNameMap>(selector: K, root?: SelectorRoot): HTMLElementTagNameMap[K];
function $<T extends HTMLElement>(selector: string, root?: SelectorRoot): T;
function $(selector: string, root: SelectorRoot = document): HTMLElement {
  return root.querySelector(selector);
}

function $$<K extends keyof HTMLElementTagNameMap>(selector: K, root?: SelectorRoot): NodeListOf<HTMLElementTagNameMap[K]>;
function $$<T extends HTMLElement>(selector: string, root?: SelectorRoot): NodeListOf<T>;
function $$(selector: string, root: SelectorRoot = document): NodeListOf<HTMLElement> {
  return root.querySelectorAll(selector);
}

function create<K extends keyof HTMLElementTagNameMap>(ele: K): HTMLElementTagNameMap[K];
function create<T extends HTMLElement>(ele: string): T;
function create(ele: string): HTMLElement {
  return document.createElement(ele);
}

/* Url */

function makeAbsolute(path: string, domain: string): string {
  return (/^(?:https?:)?\/\//).test(path)
    ? path
    : domain + (path.startsWith('/') ? path : '/' + path);
}

type QueryVariableSet = {
  [key: string]: string,
};
function getQueryVariableAll(): QueryVariableSet {
  const search = window.location.search;
  if (search === '') return {};
  const arr = search
    .substring(1)
    .split('&')
    .map(string => string.split('='));
  const dict = {};
  for (const list of arr) {
    dict[list[0]] = list[1];
  }
  return dict;
}

function getQueryVariable(key: string): string {
  return getQueryVariableAll()[key];
}

function makeQueryString(queries: QueryVariableSet): string {
  return '?' + Object
    .entries(queries)
    .map(arr => arr.join('='))
    .join('&');
}

export {
  $,
  $$,
  create,
  makeAbsolute,
  getQueryVariable,
  getQueryVariableAll,
  makeQueryString
};
