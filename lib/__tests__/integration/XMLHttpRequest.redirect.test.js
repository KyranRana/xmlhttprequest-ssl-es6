import XMLHttpRequest from '../../XMLHttpRequest'
import http from 'http'

describe("XMLHttpRequest redirect tests", () => {
    test.each`
    statusCode | requestMethod | redirectRequestMethod
    ${302}     | ${'GET'}      | ${'GET'}
    ${303}     | ${'POST'}     | ${'GET'}
    ${307}     | ${'POST'}     | ${'POST'}
    `("$statusCode redirects with a request method \"$requestMethod\" to request method \"$redirectRequestMethod\"", 
        async ({ statusCode, requestMethod, redirectRequestMethod }) => {
            const asyncTest = () => new Promise(resolve => {
                const server = http.createServer(function(req, res) {
                    if (req.url === '/redirectingResource') {
                        res.writeHead(statusCode, {'Location': 'http://localhost:8000/'})
                        res.end()
                        
                        return
                    }
                
                    expect(req.method).toBe(redirectRequestMethod)
        
                    const body = "Hello World"
        
                    res.writeHead(200, {
                        "Content-Type": "text/plain",
                        "Content-Length": Buffer.byteLength(body),
                        "Date": "Thu, 30 Aug 2012 18:17:53 GMT",
                        "Connection": "close"
                    })
                    res.write(body)
                    res.end()
                
                    this.close()
                }).listen(8000)
        
                server.on("close", resolve)

                const xhr = new XMLHttpRequest()

                xhr.open(requestMethod, "http://localhost:8000/redirectingResource")
                xhr.send()
            })

        await asyncTest()
    })
})