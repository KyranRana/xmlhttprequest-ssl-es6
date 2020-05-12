import http from 'http'
import XMLHttpRequest from '../../main/XMLHttpRequest'

import { 
    DONE 
} from '../../main/XMLHttpRequestStates'

describe('XMLHttpRequest async tests', () => {
    test('http test', done => {
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
        }).listen(8003)

        server.on('close', done)

        const xhr = new XMLHttpRequest()
        
        xhr.open('GET', 'http://localhost:8003', true)
        xhr.send()

        xhr.onreadystatechange = function() {
            if (this.readyState === DONE) {
                expect(this.responseText).toBe('Hello World')

                server.close()
            }
        }
    })

    test('ftp test', done => {
        const xhr = new XMLHttpRequest()

        const parentdir = __dirname.replace('/integration', '')

        xhr.open('GET', `file://${parentdir}/resource/hello-world.txt`, true)
        xhr.send()

        xhr.onreadystatechange = function() {
            if (this.readyState === DONE) {
                expect(this.responseText).toBe('Hello World')

                done()
            }
        }
    })
})