
/* Shorthands  */

type HTMLElementEvent<T extends HTMLElement = HTMLElement> = Event & {target: T};
type SelectorRoot = Document | HTMLElement;

function $<K extends keyof HTMLElementTagNameMap>(selector: K, root?: SelectorRoot): HTMLElementTagNameMap[K] | null;
function $<T extends HTMLElement>(selector: string, root?: SelectorRoot): T | null;
function $(selector: string, root: SelectorRoot = document): HTMLElement | null {
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
  const params = new URLSearchParams(window.location.search);
  const dict: QueryVariableSet = {};
  for (const [key, val] of params.entries()) {
    dict[key] = val;
  }
  return dict;
}

function getQueryVariable(key: string): string {
  return getQueryVariableAll()[key];
}

function makeQueryString(queries: QueryVariableSet): string {
  const params = new URLSearchParams(queries);
  return '?' + params.toString();
}

function escapeRegExp(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function onReadyFactory(): (fn: () => void) => void {
  const callbacks: Array<() => void> = [];
  document.addEventListener('DOMContentLoaded', () => callbacks.forEach(fn => fn()), {once: true});
  return (fn): void => {
    if (document.readyState == 'loading') {
      callbacks.push(fn);
    } else {
      fn();
    }
  };
}

function debounce(fn: (...args: unknown[]) => unknown, delay: number): (...args: unknown[]) => void {
  let timeout: number;
  return (...args: unknown[]) => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(fn, delay, ...args);
  };
}

function sleep(duration: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, duration));
}

function onLeftClick(callback: (event: MouseEvent) => void, root: SelectorRoot = document): void {
  root.addEventListener('click', e => {
    if (e instanceof MouseEvent && e.button === 0) callback(e);
  });
}

export {
  $,
  $$,
  create,
  makeAbsolute,
  getQueryVariable,
  getQueryVariableAll,
  makeQueryString,
  escapeRegExp,
  onReadyFactory,
  debounce,
  sleep,
  onLeftClick,
};
export type {
  HTMLElementEvent,
};
