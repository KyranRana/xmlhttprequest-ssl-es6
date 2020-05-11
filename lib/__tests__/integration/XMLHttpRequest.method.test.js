import XMLHttpRequest from "../../XMLHttpRequest"
import { DONE } from "../../XMLHttpRequestStates"
import http, { request } from "http"

describe("XMLHttpRequest method tests", () => {
    test.each`
    requestMethod
    ${'GET'}
    ${'POST'}
    ${'HEAD'}
    ${'PUT'}
    ${'DELETE'}
    `("Can request with method $requestMethod", async ({ requestMethod }) => {
        const asyncTest = () => new Promise(resolve => {
            const server = http.createServer(function(req, res) {
                expect(req.method).toBe(requestMethod)
            
                const body = (req.method != "HEAD" ? "Hello World" : "")
            
                res.writeHead(200, {
                    "Content-Type": "text/plain",
                    "Content-Length": Buffer.byteLength(body)
                })
                
                // HEAD has no body
                if (req.method != "HEAD") {
                    res.write(body)
                }
                
                res.end()
            }).listen(8001)

            server.on("close", resolve)

            const xhr = new XMLHttpRequest()

            xhr.open(requestMethod, "http://localhost:8001/")
            xhr.send()

            xhr.onreadystatechange = function() {
                if (this.readyState === DONE) {
                    if (requestMethod === "HEAD") {
                        expect(this.responseText).toBe("")
                    } else {
                        expect(this.responseText).toBe("Hello World")
                    }

                    server.close()
                }
            }
        })

        await asyncTest()
    })
})