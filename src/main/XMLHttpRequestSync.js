import http from 'http'
import https from 'https'
import zlib from 'zlib'

function makeSyncRequest(ssl, options, data) {
    return new Promise((resolve, reject) => {
        const doRequest = ssl ? https.request : http.request
        
        const request = doRequest(options, response => {
            const stream = response
            
            const responseBuffer = []
            stream.on('data', chunk => {
                if (chunk) {
                    responseBuffer.push(chunk)
                }
            })

            stream.on('end', () => {
                let responseText

                const contentEncoding = response.headers['content-encoding']
                if (contentEncoding === "gzip" 
                    || contentEncoding === "deflate" 
                    || contentEncoding === "compression") {
                    responseText = zlib.gunzipSync(Buffer.concat(responseBuffer)).toString("utf8")
                } else {
                    responseText = responseBuffer.toString("utf8")
                }

                resolve({ 
                    statusCode: response.statusCode,
                    responseHeaders: response.headers,
                    responseBuffer,
                    responseText 
                })
            })
            
            response.on('error', reject)
        
        }).on('error', reject)

        if (data) {
            request.write(data)
        }

        request.end()
    })
}

const ssl = process.argv[2] == 'true'
const options = JSON.parse(process.argv[3])
const data = process.argv[4] == 'null' ? false : process.argv[4]

makeSyncRequest(ssl, options, data)
    .then(data => process.stdout.write(JSON.stringify(data)))
    .catch(error => process.stderr.write(JSON.stringify(error)))