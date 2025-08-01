/*
https://github.com/vannhi/userscript-typescript-webpack/blob/master/tampermonkey-module.d.ts
*/
/* eslint-disable
  @typescript-eslint/no-unsafe-function-type,
  @typescript-eslint/no-explicit-any
*/
declare const unsafeWindow: typeof window;

declare const GM_info: {
  version: string,
  scriptWillUpdate: boolean,
  scriptHandler: 'Tampermonkey' | 'Violentmonkey' | 'Greasemonkey',
  scriptUpdateURL?: string,
  scriptSource: string,
  scriptMetaStr?: string,
  isIncognito: boolean,
  downloadMode: 'native' | 'disabled' | 'browser',
  script: {
    'author'?: string,
    'description'?: string,
    'excludes': string[],
    'homepage'?: string,
    'icon'?: string,
    'icon64'?: string,
    'includes'?: string[],
    'lastModified': number,
    'matches': string[],
    'name': string,
    'namespace'?: string,
    'position': number,
    'run-at': string,
    'resources': string[],
    'unwrap': boolean,
    'version': string,
    'options': {
      awareOfChrome: boolean,
      run_at: string,
      noframes?: boolean,
      compat_arrayLeft: boolean,
      compat_foreach: boolean,
      compat_forvarin: boolean,
      compat_metadata: boolean,
      compat_uW_gmonkey: boolean,
      override: {
        orig_excludes: string[],
        orig_includes: string[],
        use_includes: string[],
        use_excludes: string[],
        [key: string]: any,
      },
      [key: string]: any,
    },
    [key: string]: any,
  },
  [key: string]: any,
};

declare function GM_addStyle(css: string): void;

declare function GM_deleteValue(name: string): void;

declare function GM_listValues(): string[];

declare function GM_addValueChangeListener(name: string, listener: GM_Types.ValueChangeListener): number | string;  // Tampermonkey: number, Violentmonkey: string

declare function GM_removeValueChangeListener(listenerId: number | string): void; // Tampermonkey: number, Violentmonkey: string

declare function GM_setValue(name: string, value: any): void;

declare function GM_getValue(name: string, defaultValue?: any): any;

declare function GM_log(message: string): any;

declare function GM_getResourceText(name: string): string;

declare function GM_getResourceURL(name: string): string;

declare function GM_registerMenuCommand(name: string, listener: Function, accessKey?: string): number;

declare function GM_unregisterMenuCommand(id: number): void;

declare function GM_openInTab(url: string, options: GM_Types.OpenTabOptions): void;
declare function GM_openInTab(url: string, loadInBackground: boolean): void;
declare function GM_openInTab(url: string): void;

declare function GM_xmlhttpRequest<CONTEXT_TYPE>(details: GM_Types.XHRDetails<CONTEXT_TYPE>): GM_Types.AbortHandle<void>;


declare function GM_download(details: GM_Types.DownloadDetails): GM_Types.AbortHandle<boolean>;
declare function GM_download(url: string, filename: string): GM_Types.AbortHandle<boolean>;

declare function GM_getTab(callback: (obj: object) => any): void;
declare function GM_saveTab(obj: object): void;
declare function GM_getTabs(callback: (objs: {[key: number]: object}) => any): void;

declare function GM_notification(details: GM_Types.NotificationDetails, ondone: Function): void;
declare function GM_notification(text: string, title: string, image: string, onclick: Function): void;

declare function GM_setClipboard(data: string, info?: string | {type?: string, minetype?: string}): void;

declare namespace GM_Types {

  type ValueChangeListener = (name: string, oldValue: any, newValue: any, remote: boolean) => any;

  interface OpenTabOptions {
    active?: boolean;
    insert?: boolean;
    setParent?: boolean;
  }

  interface XHRResponse<CONTEXT_TYPE> extends Function {

    DONE: 4;
    HEADERS_RECEIVED: 2;
    LOADING: 3;
    OPENED: 1;
    UNSENT: 0;

    context: CONTEXT_TYPE;
    finalUrl: string;
    readyState: 0 | 1 | 2 | 3 | 4;
    responseHeaders: string;
    status: number;
    statusText: string;
    response: any;
    responseText: string;
    responseXML: Document | null;
  }

  interface XHRProgress<CONTEXT_TYPE> extends XHRResponse<CONTEXT_TYPE> {
    done: number;
    lengthComputable: boolean;
    loaded: number;
    position: number;
    total: number;
    totalSize: number;
  }

  type Listener<OBJ> = (this: OBJ, event: OBJ) => any;

  interface XHRDetails<CONTEXT_TYPE> {
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT';
    url: string;
    headers?: {readonly [key: string]: string};
    data?: string;
    binary?: boolean;
    timeout?: number;
    context?: CONTEXT_TYPE;
    responseType?: 'arraybuffer' | 'blob' | 'json';
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    username?: string;
    password?: string;

    onload?: Listener<XHRResponse<CONTEXT_TYPE>>;
    onloadstart?: Listener<XHRResponse<CONTEXT_TYPE>>;
    onprogress?: Listener<XHRProgress<CONTEXT_TYPE>>;
    onreadystatechange?: Listener<XHRResponse<CONTEXT_TYPE>>;
    ontimeout?: Listener<XHRProgress<CONTEXT_TYPE>>;
    onabort?: Listener<XHRProgress<CONTEXT_TYPE>>;
    onerror?: Listener<XHRProgress<CONTEXT_TYPE>>;
  }

  interface AbortHandle<RETURN_TYPE> {
    abort(): RETURN_TYPE;
  }

  interface DownloadError {
    error: 'not_enabled' | 'not_whitelisted' | 'not_permitted' | 'not_supported' | 'not_succeeded';
    details?: string;
  }

  interface DownloadDetails {
    url: string;
    name: string;
    headers?: {readonly [key: string]: string};
    saveAs?: boolean;
    timeout?: number;
    onerror?: Listener<DownloadError>;
    ontimeout?: Listener<object>;
    onload?: Listener<object>;
    onprogress?: Listener<XHRProgress<void>>;
  }

  interface NotificationThis extends NotificationDetails {
    id: string;
  }

  type NotificationOnClick = (this: NotificationThis) => any;
  type NotificationOnDone = (this: NotificationThis, clicked: boolean) => any;

  interface NotificationDetails {
    text?: string;
    title?: string;
    image?: string;
    highlight?: boolean;
    timeout?: number;
    onclick?: NotificationOnClick;
    ondone?: NotificationOnDone;
  }
}

declare namespace GMType {
  type RegisterMenuCommandListener = () => void;
  type MenuCommandId = number;
  type StorageValue = string | number | boolean;
  interface NotificationDetails {
    text?: string;
    title?: string;
    image?: string;
    highlight?: boolean;
    silent?: boolean;
    timeout?: number;
    ondone?: NotificationOnDone;
    onclick?: NotificationOnClick;
  }
  interface NotificationThis extends NotificationDetails {
    id: string;
  }
  type NotificationOnClick = (this: NotificationThis) => any;
  type NotificationOnDone = (this: NotificationThis, clicked: boolean) => any;
}

interface GMInterface {
  getValue(key: string, defaultValue: GMType.StorageValue): Promise<GMType.StorageValue>;
  setValue(key: string, value: GMType.StorageValue): Promise<void>;

  registerMenuCommand(caption: string, commandFunc: GMType.RegisterMenuCommandListener, accessKey?: string): Promise<GMType.MenuCommandId>;
  unregisterMenuCommand(menuCmdId: GMType.MenuCommandId): Promise<void>;

  addStyle(css: string): Promise<HTMLStyleElement>;

  notification(details: GMType.NotificationDetails, ondone?: GMType.NotificationOnDone): Promise<void>;
  notification(text: string, title: string, image?: string, onclick?: GMType.NotificationOnDone): Promise<void>;
}

declare const GM: GMInterface;
