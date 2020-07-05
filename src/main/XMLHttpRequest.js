/**
 * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
 *
 * This can be used with JS designed for browsers to improve reuse of code and
 * allow the use of existing libraries.
 *
 * Usage: include('XMLHttpRequest.js') and use XMLHttpRequest per W3C specs.
 *
 * @author Dan DeFelippi <dan@driverdan.com>
 * @contributor David Ellis <d.f.ellis@ieee.org>
 * @license MIT
 */
import fs from 'fs'
import zlib from 'zlib'
import http from 'http'
import https from 'https'

import Url, { 
    fileURLToPath 
} from 'url'

import { 
    dirname 
} from 'path'

import {
    spawnSync
} from 'child_process'

import {
    FORBIDDEN_REQUEST_HEADERS,
    FORBIDDEN_REQUEST_METHODS
} from './XMLHttpRequestConstants.js'

import {
    UNSENT, 
    OPENED, 
    HEADERS_RECEIVED, 
    LOADING, 
    DONE
} from './XMLHttpRequestStates.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * `XMLHttpRequest`
 *
 * Supported options for the `opts` object are:
 *
 *  - `agent`: An http.Agent instance; http.globalAgent may be used; if 'undxefined', agent usage is disabled
 *
 * @param {Object} opts optional 'options' object
 */

class XMLHttpRequest {
    // States
    static get UNSENT()             { return UNSENT }
    static get OPENED()             { return OPENED }
    static get HEADERS_RECEIVED()   { return HEADERS_RECEIVED }
    static get LOADING()            { return LOADING }
    static get DONE()               { return DONE }

    constructor(options) {
        /* Private variables */
        this._options = options || {}
        
        this._request = null
        this._requestSettings = {}

        this._defaultRequestHeaders = {
            'user-agent': 'node-XMLHttpRequest',
            'accept': '*/*'
        }
        this._requestHeaders = Object.assign({}, this._defaultRequestHeaders)

        this._response = null

        // Disable header blacklist.
        // Not part of XHR specs.
        this._disableHeaderCheck = false

        // Send flag
        this._sendFlag = false
        // Error flag, used when errors occur or abort is called
        this._errorFlag = false
        this._abortedFlag = false

        this._eventListeners = {}

        /* Public variables */
        // Current state
        this.readyState = UNSENT

        // default ready state change handler in case one is not set or is set late
        this.onreadystatechange = null

        // Result & response
        this.responseBuffer = []
        this.responseText = ''
        this.responseXML = ''
        this.status = null
        this.statusText = null
    }

    /**
     * Check if the specified header is allowed.
     *
     * @param string header Header to validate
     * @return boolean False if not allowed, otherwise true
     */
    _isAllowedHttpHeader(header) {
        return this._disableHeaderCheck || (header && FORBIDDEN_REQUEST_HEADERS.indexOf(header.toLowerCase()) === -1)
    }

    /**
     * Check if the specified method is allowed.
     *
     * @param string method Request method to validate
     * @return boolean False if not allowed, otherwise true
     */
    _isAllowedHttpMethod(method) {
        return (method && FORBIDDEN_REQUEST_METHODS.indexOf(method) === -1)
    }

    /**
     * Open the connection. Currently supports local server requests.
     *
     * @param string method Connection method (eg GET, POST)
     * @param string url URL for the connection.
     * @param boolean async Asynchronous connection. Default is true.
     * @param string user Username for basic authentication (optional)
     * @param string password Password for basic authentication (optional)
     */
    open(method, url, async, user, password) {
        this.abort()

        this._errorFlag = false
        this._abortedFlag = false
    
        // Check for valid request method
        if (!this._isAllowedHttpMethod(method)) {
          throw new Error('SecurityError: Request method not allowed')
        }
    
        this._requestSettings = {
          'method': method,
          'url': url.toString(),
          'async': (typeof async !== 'boolean' ? true : async),
          'user': user || null,
          'password': password || null
        }
    
        this.setState(OPENED)
    }

    /**
     * Disables or enables isAllowedHttpHeader() check the request. Enabled by default.
     * This does not conform to the W3C spec.
     *
     * @param boolean state Enable or disable header checking.
     */
    setDisableHeaderCheck(state) {
        this._disableHeaderCheck = state
    }

    /**
     * Sets a header for the request.
     *
     * @param string header Header name
     * @param string value Header value
     * @return boolean Header added
     */
    setRequestHeader(header, value) {
        if (this.readyState != OPENED) {
            throw new Error('INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN')
        }

        let lowercaseHeader = header.toLowerCase()
        if (!this._isAllowedHttpHeader(lowercaseHeader)) {
            console.warn('Refused to set unsafe header \'' + lowercaseHeader + '\'')
            return false
        }
        
        if (this._sendFlag) {
            throw new Error('INVALID_STATE_ERR: send flag is true')
        }
        
        this._requestHeaders[lowercaseHeader] = value
        
        return true
    }

    /**
     * Gets a header from the server response.
     *
     * @param string header Name of header to get.
     * @return string Text of the header or null if it doesn't exist.
     */
    getResponseHeader(header) {
        if (typeof header === 'string'
            && this.readyState > OPENED
            && this._response.headers[header.toLowerCase()]
            && !this._errorFlag
        ) {
            return this._response.headers[header.toLowerCase()]
        }

        return null
    }

    /**
     * Gets all the response headers.
     *
     * @return string A string with all response headers separated by CR+LF
     */
    getAllResponseHeaders() {
        if (this.readyState < HEADERS_RECEIVED || this._errorFlag) {
            return ''
        }
        
        let result = ''

        for (let i in this._response.headers) {
            // Cookie headers are excluded
            if (i !== 'set-cookie' && i !== 'set-cookie2') {
                result += i + ': ' + this._response.headers[i] + '\r\n'
            }
        }

        return result.substr(0, result.length - 2)
    }

    /**
     * Gets a request header
     *
     * @param string name Name of header to get
     * @return string Returns the request header or empty string if not set
     */
    getRequestHeader(name) {
        if (typeof name === 'string') {
            let lowercaseName = name.toLowerCase()

            if (this._requestHeaders[lowercaseName]) {
                return this._requestHeaders[lowercaseName]
            }
        }

        return ''
    }

    /**
     * Sends the request to the server.
     *
     * @param string data Optional data to send as request body.
     */
    send(data) {
        if (this.readyState != OPENED) {
            throw new Error('INVALID_STATE_ERR: connection must be opened before send() is called')
        }

        if (this._sendFlag) {
            throw new Error('INVALID_STATE_ERR: send has already been called')
        }

        let ssl = false, local = false
        let url = Url.parse(this._requestSettings.url)
        let host

        // Determine the server
        switch (url.protocol) {
            case 'https:':
                ssl = true
                // SSL & non-SSL both need host, no break here.
            case 'http:':
                host = url.hostname
                break

            case 'file:':
                local = true
                break

            case undefined:
            case '':
                host = 'localhost'
                break

            default:
                throw new Error('Protocol not supported.')
        }

        // Load files off the local filesystem (file://)
        if (local) {
            if (this._requestSettings.method !== 'GET') {
                throw new Error('XMLHttpRequest: Only GET method is supported')
            }

            if (this._requestSettings.async) {
                fs.readFile(url.pathname, (error, buffer) => {
                    if (error) {
                        this.handleError(error)
                    } else {
                        this.status = 200
                        this.responseBuffer = buffer
                        this.responseText = buffer.toString('utf8')
                        
                        this.setState(DONE)
                    }
                })
            } else {
                try {
                    this.responseBuffer = fs.readFileSync(url.pathname)
                    this.responseText = this.responseBuffer.toString('utf8')
                    this.status = 200
                        
                    this.setState(DONE)
                } catch(e) {
                    this.handleError(e)
                }
            }

            return
        }

        // Default to port 80. If accessing localhost on another port be sure
        // to use http://localhost:port/path
        let port = url.port || (ssl ? 443 : 80)

        // Add query string if one is used
        let uri = url.pathname + (url.search ? url.search : '')

        // Set the Host header or the server may reject the request
        this._requestHeaders['host'] = host
        if (!((ssl && port === 443) || port === 80)) {
            this._requestHeaders['host'] += ':' + url.port
        }

        // Set Basic Auth if necessary
        if (this._requestSettings.user) {
            if (typeof this._requestSettings.password == 'undefined') {
                this._requestSettings.password = ''
            }
            
            var authBuf = new Buffer(this._requestSettings.user + ':' + this._requestSettings.password)
            this._requestHeaders['authorization'] = 'Basic ' + authBuf.toString('base64')
        }

        // Set content length header
        if (this._requestSettings.method === 'GET' || this._requestSettings.method === 'HEAD') {
            data = null
        } else if (data) {
            this._requestHeaders['content-length'] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data)

            if (!this._requestHeaders['content-type']) {
                this._requestHeaders['content-type'] = 'text/plain;charset=UTF-8'
            }
        } else if (this._requestSettings.method === 'POST') {
            // For a post with no data set Content-Length: 0.
            // This is required by buggy servers that don't meet the specs.
            this._requestHeaders['content-length'] = 0
        }

        let agent = this._options.agent || false
        let options = {
            host: host,
            port: port,
            path: uri,
            method: this._requestSettings.method,
            headers: this._requestHeaders,
            agent: agent
        }

        if (ssl) {
            options.pfx = this._options.pfx
            options.key = this._options.key
            options.passphrase = this._options.passphrase
            options.cert = this._options.cert
            options.ca = this._options.ca
            options.ciphers = this._options.ciphers
            options.rejectUnauthorized = this._options.rejectUnauthorized
        }

        const errorHandler = error => this.handleError(error)

        // Reset error flag
        this._errorFlag = false

        // Handle async requests
        if (this._requestSettings.async) {
            // Use the proper protocol
            let doRequest = ssl ? https.request : http.request

            // Request is being sent, set send flag
            this._sendFlag = true

            // As per spec, this is called here for historical reasons.
            this.dispatchEvent('readystatechange')

            let responseHandler = resp => {
                // Set response var to the response we got back
                // This is so it remains accessable outside this scope
                this._response = resp
                this._stream = resp             
                
                // Check for redirect
                // @TODO Prevent looped redirects
                if (this._response.statusCode === 302 || this._response.statusCode === 303 || this._response.statusCode === 307) {
                    // Change URL to the redirect location
                    this._requestSettings.url = this._response.headers.location
                    let url = Url.parse(this._requestSettings.url)
                    
                    // Set host var in case it's used later
                    host = url.hostname
                    
                    // Options for the new request
                    let newOptions = {
                        hostname: url.hostname,
                        port: url.port,
                        path: url.path,
                        method: this._response.statusCode === 303 ? 'GET' : this._requestSettings.method,
                        headers: this._requestHeaders
                    }

                    if (ssl) {
                        newOptions.pfx = this._options.pfx
                        newOptions.key = this._options.key
                        newOptions.passphrase = this._options.passphrase
                        newOptions.cert = this._options.cert
                        newOptions.ca = this._options.ca
                        newOptions.ciphers = this._options.ciphers
                        newOptions.rejectUnauthorized = this._options.rejectUnauthorized
                    }

                    // Issue the new request
                    this._request = doRequest(newOptions, responseHandler).on('error', errorHandler)
                    this._request.end()
                    
                    // @TODO Check if an XHR event needs to be fired here
                    return
                }

                this.setState(HEADERS_RECEIVED)
                this.status = this._response.statusCode

                const responseBuffer = []
                this._stream.on('data', chunk => {
                    // Make sure there's some data
                    if (chunk) {
                        responseBuffer.push(chunk)
                    }
       
                    // Don't emit state changes if the connection has been aborted.
                    if (this._sendFlag) {
                        this.setState(LOADING)
                    }
                })

                this._stream.on('end', () => {
                    if (this._sendFlag) {
                        const contentEncoding = resp.headers['content-encoding']
                        if (contentEncoding === "gzip" 
                            || contentEncoding === "deflate" 
                            || contentEncoding === "compression") {
                            this.responseText = zlib.gzipSync(responseBuffer).toString("utf8")
                        } else {
                            this.responseText = responseBuffer.toString("utf8")
                        }

                        this.responseBuffer = responseBuffer

                        // The sendFlag needs to be set before setState is called.  Otherwise if we are chaining callbacks
                        // there can be a timing issue (the callback is called and a new call is made before the flag is reset).
                        this._sendFlag = false
                
                        // Discard the 'end' event if the connection has been aborted
                        this.setState(DONE)
                    }
                })

                this._stream.on('error', error => {
                    this.handleError(error)
                })
            }

            // Create the request
            this._request = doRequest(options, responseHandler).on('error', errorHandler)

            // Node 0.4 and later won't accept empty data. Make sure it's needed.
            if (data) {
                this._request.write(data)
            }

            this._request.end()

            this.dispatchEvent('loadstart')
        } else { // Synchronous
            const syncProc = spawnSync(process.argv[0], [
                `${__dirname}/XMLHttpRequestSync.js`, 
                ssl, 
                JSON.stringify(options),
                data
            ])

            const rawResponse = new String(syncProc.stdout)
            const rawErrorMessage = new String(syncProc.stderr)
            
            if (syncProc.status !== 0) {
                const errorMessage = JSON.parse(rawErrorMessage)

                this.handleError(errorMessage, 503)
            } else {
                // If the file returned okay, parse its data and move to the DONE state
                const response = JSON.parse(rawResponse)

                this.status = response.statusCode
                this.responseBuffer = response.responseBuffer
                this.responseText = response.responseText

                this._response = this._response || {}
                this._response.headers = response.responseHeaders
            
                this.setState(DONE)
            }
        }
    }

    /**
     * Called when an error is encountered to deal with it.
     * @param  status  {number}    HTTP status code to use rather than the default (0) for XHR errors.
     */
    handleError(error, status) {
        this.status = status || 0

        this.statusText = error
        this.responseText = error.stack

        this._errorFlag = true
        
        this.setState(DONE)
    }

    /**
     * Aborts a request.
     */
    abort() {
        if (this._request) {
            this._request.abort()
            this._request = null
        }

        this._requestHeaders = Object.assign({}, this._defaultRequestHeaders)
        
        this.responseText = ''
        this.responseXML = ''

        this._errorFlag = true
        this._abortedFlag = true

        if (this.readyState !== UNSENT
            && (this.readyState !== OPENED || this._sendFlag)
            && this.readyState !== DONE) {
            
            this._sendFlag = false

            this.setState(DONE)
        }

        this.readyState = UNSENT
    }

    /**
     * Adds an event listener. Preferred method of binding to events.
     */
    addEventListener(event, callback) {
        if (!(event in this._eventListeners)) {
            this._eventListeners[event] = []
        }

        // Currently allows duplicate callbacks. Should it?
        this._eventListeners[event].push(callback)
    }

    /**
     * Remove an event callback that has already been bound.
     * Only works on the matching funciton, cannot be a copy.
     */
    removeEventListener(event, callback) {
        if (event in this._eventListeners) {
            // Filter will return a new array with the callback removed
            this._eventListeners[event] = this._eventListeners[event].filter(ev => {
                return ev !== callback
            })
        }
    }

    /**
     * Dispatch any events, including both 'on' methods and events attached using addEventListener.
     */
    dispatchEvent(event) {
        if (typeof this['on' + event] === 'function') {
            if (this.readyState === DONE) {
                setImmediate(() => this['on' + event]())
            } else {
                this['on' + event]()
            }
        }
        
        if (event in this._eventListeners) {
            for (const callback of this._eventListeners[event]) {
                if (this.readyState === DONE) {
                    setImmediate(() => callback.call(this))
                } else {
                    callback.call(this)
                }
            }
        }
    }

    /**
     * Changes readyState and calls onreadystatechange.
     *
     * @param int state New state
     */
    setState(state) {
        if ((this.readyState === state) || (this.readyState === UNSENT && this._abortedFlag)) {
            return
        }

        this.readyState = state

        if (this._requestSettings.async || this.readyState < OPENED || this.readyState === DONE) {
            this.dispatchEvent('readystatechange')
        }

        if (this.readyState === DONE) {
            let fire

            if (this._abortedFlag) {
                fire = 'abort'
            } else if (this._errorFlag) {
                fire = 'error'
            } else {
                fire = 'load'
            }

            this.dispatchEvent(fire)

            // @TODO figure out InspectorInstrumentation::didLoadXHR(cookie)
            this.dispatchEvent('loadend')
        }
    }
}

export default XMLHttpRequest