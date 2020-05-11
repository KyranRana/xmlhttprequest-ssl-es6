import { FORBIDDEN_REQUEST_METHODS } from '../XMLHttpRequestConstants'

import XMLHttpRequest from '../XMLHttpRequest'

describe("XMLHttpRequest open tests", () => {
    test.each(
        FORBIDDEN_REQUEST_METHODS.map(v => [v])
    )("Can not open a connecton with forbidden request method \"%s\"", requestMethod => {
        const xhr = new XMLHttpRequest()

        const abortSpy = jest.spyOn(xhr, 'abort')
        
        expect(() => xhr.open(requestMethod, "http://localhost:8000"))
            .toThrow(new Error("SecurityError: Request method not allowed"))

        expect(abortSpy).toHaveBeenCalledTimes(1)

        abortSpy.mockRestore()
    })
})