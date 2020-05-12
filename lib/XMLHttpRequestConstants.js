"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FORBIDDEN_REQUEST_METHODS = exports.FORBIDDEN_REQUEST_HEADERS = void 0;
// These headers are not user setable.
// The following are allowed but banned in the spec:
// * user-agent
const FORBIDDEN_REQUEST_HEADERS = ['accept-charset', 'accept-encoding', 'access-control-request-headers', 'access-control-request-method', 'connection', 'content-length', 'content-transfer-encoding', 'cookie', 'cookie2', 'date', 'expect', 'host', 'keep-alive', 'origin', 'referer', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'via']; // These request methods are not allowed

exports.FORBIDDEN_REQUEST_HEADERS = FORBIDDEN_REQUEST_HEADERS;
const FORBIDDEN_REQUEST_METHODS = ['TRACE', 'TRACK', 'CONNECT'];
exports.FORBIDDEN_REQUEST_METHODS = FORBIDDEN_REQUEST_METHODS;