import _ from 'lodash';
import {
  CraftAiBadRequestError,
  CraftAiCredentialsError,
  CraftAiInternalError,
  CraftAiNetworkError,
  CraftAiUnknownError
} from './errors';
import Debug from 'debug';

const fetch = typeof window === 'undefined' && typeof fetch === 'undefined'
  ? require('node-fetch')
  : window.fetch;

const debug = Debug('craft-ai:client');

function parseBody(req, resBody) {
  let resBodyUtf8;
  try {
    resBodyUtf8 = resBody.toString('utf-8');
  }
  catch (err) {
    debug(`Invalid response format from ${req.method} ${req.path}: ${resBody}`, err);
    throw new CraftAiInternalError(
      'Internal Error, the craft ai server responded in an invalid format.', {
        request: req
      }
    );
  }
  let resBodyJson;
  try {
    if (resBodyUtf8.length > 0) {
      resBodyJson = JSON.parse(resBodyUtf8);
    }
    else {
      resBodyJson = {};
    }
  }
  catch (err) {
    debug(`Invalid json response from ${req.method} ${req.path}: ${resBody}`, err);
    throw new CraftAiInternalError(
      'Internal Error, the craft ai server responded an invalid json document.', {
        more: resBodyUtf8,
        request: req
      }
    );
  }
  return resBodyJson;
}

function parseResponse(req, resStatus, resBody) {
  switch (resStatus) {
    case 200:
    case 201:
    case 204:
      return parseBody(req, resBody);
    case 401:
    case 403:
      throw new CraftAiCredentialsError({
        message: parseBody(req, resBody).message,
        request: req
      });
    case 400:
    case 404:
      throw new CraftAiBadRequestError({
        message: parseBody(req, resBody).message,
        request: req
      });
    case 413:
      throw new CraftAiBadRequestError({
        message: 'Given payload is too large',
        request: req
      });
    case 500:
      throw new CraftAiInternalError(parseBody(req, resBody).message, {
        request: req
      });
    case 504:
      throw new CraftAiInternalError({
        message: 'Response has timed out',
        request: req,
        status: resStatus
      });
    default:
      throw new CraftAiUnknownError({
        more: parseBody(req, resBody).message,
        request: req,
        status: resStatus
      });
  }
}

export default function request(req, cfg) {
  req = _.defaults(req || {}, {
    method: 'GET',
    path: '',
    body: undefined,
    query: {},
    headers: {}
  });

  req.url = `${cfg.url}/api/v1/${cfg.owner}/${cfg.project}${req.path}`;
  if (_.size(req.query) > 0) {
    req.url = `${req.url}?${_.map(req.query, (value, key) => `${key}=${value}`).join('&')}`;
  }
  req.headers['Authorization'] = `Bearer ${cfg.token}`;
  req.headers['Content-Type'] = 'application/json; charset=utf-8';
  req.headers['Accept'] = 'application/json';

  req.body = req.body && JSON.stringify(req.body);

  return fetch(req.url, req)
    .catch(err => Promise.reject(new CraftAiNetworkError({
      more: err.message
    })))
    .then(res => res.text()
      .catch(err => {
        debug(`Invalid response from ${req.method} ${req.path}`, err);

        throw new CraftAiInternalError('Internal Error, the craft ai server responded an invalid response, see err.more for details.', {
          request: req,
          more: err.message
        });
      })
      .then(resBody => parseResponse(req, res.status, resBody))
    );
}
