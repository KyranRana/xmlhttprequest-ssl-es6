// These headers are not user setable.
// The following are allowed but banned in the spec:
// * user-agent
export const FORBIDDEN_REQUEST_HEADERS = [
    'accept-charset',
    'accept-encoding',
    'access-control-request-headers',
    'access-control-request-method',
    'connection',
    'content-length',
    'content-transfer-encoding',
    'cookie',
    'cookie2',
    'date',
    'expect',
    'host',
    'keep-alive',
    'origin',
    'referer',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
    'via'
];

// These request methods are not allowed
export const FORBIDDEN_REQUEST_METHODS = [
    'TRACE',
    'TRACK',
    'CONNECT'
];