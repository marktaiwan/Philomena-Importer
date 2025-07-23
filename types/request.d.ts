declare function makeRequest(
  url: string,
  responseType?: GM_Types.XHRDetails<undefined>['responseType'],
  onprogress?: GM_Types.Listener<GM_Types.XHRProgress<undefined>>,
): Promise<GM_Types.XHRResponse<undefined>>;
declare function makeRequest<T extends HTMLElement>(
  url: string,
  responseType?: GM_Types.XHRDetails<T>['responseType'],
  onprogress?: GM_Types.Listener<GM_Types.XHRProgress<T>>,
  button?: T,
): Promise<GM_Types.XHRResponse<T>>;
