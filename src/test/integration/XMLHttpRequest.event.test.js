import http from 'http'

import XMLHttpRequest from '../../main/XMLHttpRequest'

import {
    UNSENT,
    OPENED,
    HEADERS_RECEIVED,
    LOADING,
    DONE
} from '../../main/XMLHttpRequestStates'

import {
    jest
} from '@jest/globals'

describe('XMLHttpRequest event tests', () => {
    test('test event lifecycle is executed correctly when successfully collecting data from a webpage', async () => {
        const asyncTest = () => new Promise(resolve => {
            const server = http.createServer(function(req, res) {
                const body = 'Hello World'

                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Length': Buffer.byteLength(body),
                    'Date': 'Thu, 30 Aug 2012 18:17:53 GMT',
                    'Connection': 'close'
                })
                res.write(body)
                res.end()
            }).listen(8005)

            server.on('close', resolve)

            let order = 0

            const callOrderCallback = function() { return [order++, this.readyState] }

            const loadstartCallback = jest.fn(callOrderCallback)
            const loadCallback = jest.fn(callOrderCallback)
            const loadendCallback = jest.fn(callOrderCallback)
            const readystatechangeCallback = jest.fn(callOrderCallback)
            
            const xhr = new XMLHttpRequest()
            xhr.onloadstart = loadstartCallback
            xhr.onload = loadCallback
            xhr.onloadend = loadendCallback
            xhr.onreadystatechange = readystatechangeCallback

            xhr.addEventListener('loadend', function() {
                expect(readystatechangeCallback.mock.calls.length).toBe(5)
                expect(readystatechangeCallback.mock.results[0].type).toBe('return')
                expect(readystatechangeCallback.mock.results[0].value[0]).toBe(0)
                expect(readystatechangeCallback.mock.results[0].value[1]).toBe(OPENED)
                
                // again called for historic reasons
                expect(readystatechangeCallback.mock.results[1].type).toBe('return')
                expect(readystatechangeCallback.mock.results[1].value[0]).toBe(1)
                expect(readystatechangeCallback.mock.results[1].value[1]).toBe(OPENED)
                
                expect(loadstartCallback.mock.calls.length).toBe(1)
                expect(loadstartCallback.mock.results[0].type).toBe('return')
                expect(loadstartCallback.mock.results[0].value[0]).toBe(2)
                expect(loadstartCallback.mock.results[0].value[1]).toBe(OPENED)
            
                expect(readystatechangeCallback.mock.results[2].type).toBe('return')
                expect(readystatechangeCallback.mock.results[2].value[0]).toBe(3)
                expect(readystatechangeCallback.mock.results[2].value[1]).toBe(HEADERS_RECEIVED)
                
                expect(readystatechangeCallback.mock.results[3].type).toBe('return')
                expect(readystatechangeCallback.mock.results[3].value[0]).toBe(4)
                expect(readystatechangeCallback.mock.results[3].value[1]).toBe(LOADING)
                
                expect(readystatechangeCallback.mock.results[4].type).toBe('return')
                expect(readystatechangeCallback.mock.results[4].value[0]).toBe(5)
                expect(readystatechangeCallback.mock.results[4].value[1]).toBe(DONE)
        
                expect(loadCallback.mock.calls.length).toBe(1)
                expect(loadCallback.mock.results[0].type).toBe('return')
                expect(loadCallback.mock.results[0].value[0]).toBe(6)
                expect(loadCallback.mock.results[0].value[1]).toBe(DONE)
        
                expect(loadendCallback.mock.calls.length).toBe(1)
                expect(loadendCallback.mock.results[0].type).toBe('return')
                expect(loadendCallback.mock.results[0].value[0]).toBe(7)
                expect(loadendCallback.mock.results[0].value[1]).toBe(DONE)

                server.close()
            })

            xhr.open('GET', 'http://localhost:8005', true)
            xhr.send()
        })

        await asyncTest()
    })

    test('test event lifecycle is executed correctly when aborting a request to a webpage', async () => {
        const asyncTest = () => new Promise(resolve => {
            const server = http.createServer(function(req, res) {
                const body = 'Hello World'

                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Length': Buffer.byteLength(body),
                    'Date': 'Thu, 30 Aug 2012 18:17:53 GMT',
                    'Connection': 'close'
                })
                res.write(body)
                res.end()
            }).listen(8006)

            server.on('close', resolve)

            let order = 0

            const callOrderCallback = function() { return [order++, this.readyState] }

            const loadstartCallback = jest.fn(callOrderCallback)
            const loadendCallback = jest.fn(callOrderCallback)
            const abortCallback = jest.fn(callOrderCallback)
            const readystatechangeCallback = jest.fn(callOrderCallback)
            
            const xhr = new XMLHttpRequest()
            xhr.onloadstart = loadstartCallback
            xhr.onloadend = loadendCallback
            xhr.onabort = abortCallback
            xhr.onreadystatechange = readystatechangeCallback

            xhr.addEventListener('loadend', function() {
                expect(readystatechangeCallback.mock.calls.length).toBe(3)
                expect(readystatechangeCallback.mock.results[0].type).toBe('return')
                expect(readystatechangeCallback.mock.results[0].value[0]).toBe(0)
                expect(readystatechangeCallback.mock.results[0].value[1]).toBe(OPENED)
                
                // again called for historic reasons
                expect(readystatechangeCallback.mock.results[1].type).toBe('return')
                expect(readystatechangeCallback.mock.results[1].value[0]).toBe(1)
                expect(readystatechangeCallback.mock.results[1].value[1]).toBe(OPENED)
                
                expect(loadstartCallback.mock.calls.length).toBe(1)
                expect(loadstartCallback.mock.results[0].type).toBe('return')
                expect(loadstartCallback.mock.results[0].value[0]).toBe(2)
                expect(loadstartCallback.mock.results[0].value[1]).toBe(OPENED)
            
                expect(readystatechangeCallback.mock.results[2].type).toBe('return')
                expect(readystatechangeCallback.mock.results[2].value[0]).toBe(3)
                expect(readystatechangeCallback.mock.results[2].value[1]).toBe(UNSENT)
                
                expect(abortCallback.mock.results[0].type).toBe('return')
                expect(abortCallback.mock.results[0].value[0]).toBe(4)
                expect(abortCallback.mock.results[0].value[1]).toBe(UNSENT)
                
                expect(loadendCallback.mock.calls.length).toBe(1)
                expect(loadendCallback.mock.results[0].type).toBe('return')
                expect(loadendCallback.mock.results[0].value[0]).toBe(5)
                expect(loadendCallback.mock.results[0].value[1]).toBe(UNSENT)

                server.close()
            })

            xhr.open('GET', 'http://localhost:8005', true)
            xhr.send()

            xhr.abort()
        })

        await asyncTest()
    })
})