import type {Twibooru, Philomena} from '../types/BooruApi';

function fetchMeta(imageID: string, booruData: BooruRecord): Promise<Philomena.Api.Image | Twibooru.Api.Image> {
  const {primaryDomain} = booruData;
  const requestURL = (booruData.bor)
    ? `${primaryDomain}/posts/${imageID}.json`
    : `${primaryDomain}/api/v1/json/images/` + imageID;
  return makeRequest(requestURL).then(resp => resp.response);
}

function makeRequest(
  url: string,
  responseType: GM_Types.XHRDetails<typeof button>['responseType'] = 'json',
  onprogress?: GM_Types.Listener<GM_Types.XHRProgress<typeof button>>,
  button?: HTMLElement,
): Promise<GM_Types.XHRResponse<typeof button>> {
  return new Promise(resolve => {
    GM_xmlhttpRequest<typeof button>({
      context: button,
      url,
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent
      },
      responseType,
      onload: resolve,
      onerror: e => {
        e.context.innerText = 'Error';
        console.log(e);
      },
      onprogress
    });
  });
}

export {makeRequest, fetchMeta};
