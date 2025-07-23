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

function getQueryVariable(key: string): string | undefined {
  const variables = getQueryVariableAll();
  return Object.prototype.hasOwnProperty.call(variables, key)
    ? variables[key]
    : undefined;
}

function makeQueryString(queries: QueryVariableSet): string {
  const params = new URLSearchParams(queries);
  return '?' + params.toString();
}

function escapeRegExp(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function debounce<T extends (...args: any[]) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout>;
  let latestPromise: {resolve: (value: ReturnType<T>) => void} | null = null;

  return (...args) => {
    // Cancel the previous execution
    clearTimeout(timer);

    return new Promise<ReturnType<T>>(resolve => {
      latestPromise = {resolve}; // Store the latest resolve function

      timer = setTimeout(() => {
        if (latestPromise) {
          latestPromise.resolve(fn(...args)); // Only resolve the most recent call
          latestPromise = null;
        }
      }, delay);
    });
  };
}

function removeFromArray<T>(array: T[], predicate: (ele: T, index: number, arr: T[]) => unknown, thisArg?: unknown): void {
  const index = array.findIndex(predicate, thisArg);
  if (index > -1) array.splice(index, 1);
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
  debounce,
  escapeRegExp,
  getQueryVariable,
  getQueryVariableAll,
  makeAbsolute,
  makeQueryString,
  onLeftClick,
  removeFromArray,
  sleep,
};
export type {
  HTMLElementEvent,
};
