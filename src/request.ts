import type {Twibooru, Philomena} from '../types/BooruApi';

function fetchMeta(imageID: string, booruData: BooruRecord): Promise<Philomena.Api.Image | Twibooru.Api.Image> {
  const {primaryDomain} = booruData;
  const requestURL = (booruData.bor)
    ? `${primaryDomain}/api/v3/posts/${imageID}`
    : `${primaryDomain}/api/v1/json/images/${imageID}`;
  return makeRequest(requestURL).then(resp => resp.response);
}

function makeRequest<T>(
  url: string,
  responseType: GM_Types.XHRDetails<T>['responseType'] = 'json',
  onprogress?: GM_Types.Listener<GM_Types.XHRProgress<T>>,
  button?: T,
): Promise<GM_Types.XHRResponse<T>> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest<T>({
      context: button,
      url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType,
      onload: resolve,
      onerror: reject,
      onprogress
    });
  });
}

export {makeRequest, fetchMeta};
