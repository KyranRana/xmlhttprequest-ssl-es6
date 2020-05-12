import {
    spawn 
} from 'child_process'

import XMLHttpRequest from '../../main/XMLHttpRequest'

describe('XMLHttpRequest sync tests', () => {

    test('http test', done => {
        expect.assertions(3)

        // we need to start up the http server in a separate instance
        const proc = spawn(process.argv[0], ['-e', `
            const http = require('http')
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
                
                this.close()
            }).listen(8004)`   
        ])
        
        const xhr = new XMLHttpRequest()
        
        xhr.open('GET', 'http://localhost:8004', false)
        xhr.send()

        expect(xhr.status).toBe(200)
        expect(xhr.responseText).toBe('Hello World')

        const interval = 100
        const maxRetries = 3
        
        let retries = 0

        const processExitCodeChecker = setInterval(() => {
            if (retries === maxRetries || proc.exitCode !== null) {
                if (retries === maxRetries) {
                    proc.kill()
                } else {
                    expect(proc.exitCode).toBe(0)
                }

                clearInterval(processExitCodeChecker)

                done()
            } else {
                retries++
            }
        }, interval)
    })

    test('ftp test', () => {
        const xhr = new XMLHttpRequest()
        
        const parentdir = __dirname.replace('/integration', '')

        xhr.open('GET', `file://${parentdir}/resource/hello-world.txt`, false)
        xhr.send()
        
        expect(xhr.responseText).toBe('Hello World')
    })
})