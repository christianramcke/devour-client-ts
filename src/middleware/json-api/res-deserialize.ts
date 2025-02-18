import * as deserialize from './_deserialize';
import { isArray } from 'lodash';
import { ApiResponse } from '../interfaces/api-response';

function needsDeserialization(method) {
  return ['GET', 'PATCH', 'POST', 'DELETE'].indexOf(method) !== -1;
}

function isCollection(responseData) {
  return isArray(responseData);
}

export default {
  name: 'response',
  res: function (payload): ApiResponse {
    /*
     *   Note: The axios ajax response attaches the actual response data to
     *         `res.data`. JSON API Resources also passes back the response with
     *         a `data` attribute. This means we have `res.data.data`.
     */
    const jsonApi = payload.jsonApi;
    const status = payload.res.status;
    const req = payload.req;
    const res = payload.res.data;
    const errors = res.errors;
    const meta = res.meta;
    const links = res.links;
    const included = res.included;

    let data = null;

    if (status !== 204 && needsDeserialization(req.method)) {
      if (isCollection(res.data)) {
        data = deserialize.collection.call(jsonApi, res.data, included);
      } else if (res.data) {
        data = deserialize.resource.call(jsonApi, res.data, included);
      }
      deserialize.cache.clear();
    }

    if (res.data && data) {
      const params = ['meta', 'links'];
      params.forEach(function (param) {
        if (res.data[param]) {
          data[param] = res.data[param];
        }
      });
    }

    //return { data, errors, meta, links, document: res } as ApiResponse;
    return new ApiResponse({ data, errors, meta, links, document: res });
  }
};
