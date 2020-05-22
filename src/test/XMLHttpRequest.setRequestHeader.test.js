import XMLHttpRequest from '../main/XMLHttpRequest'

import { 
    FORBIDDEN_REQUEST_HEADERS 
} from '../main/XMLHttpRequestConstants'

import { 
    OPENED 
} from '../main/XMLHttpRequestStates'

import {
    jest
} from '@jest/globals'

describe('XMLHttpRequest setRequestHeader tests', () => {
    test('Can not set request header without opening a connection', () => {
        const xhr = new XMLHttpRequest()

        expect(() => xhr.setRequestHeader('Test', 'Test'))
            .toThrow(new Error('INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN'))
    })

    describe('Forbidden request header tests', () => {
        const xhr = new XMLHttpRequest()

        beforeAll(() => {
            // set ready state to OPENED to mock an open connection
            // allows usage of setRequestHeader
            xhr.readyState = OPENED 
        }) 

        describe.each([
            [true], 
            [false]
        ])('disableHeaderCheck=%s', headerCheckDisabled => {
            test.each(
                FORBIDDEN_REQUEST_HEADERS.map(v => [v])
            )(`Forbidden request header \'%s\' can ${headerCheckDisabled ? '' : 'not'} be set`, 
                forbiddenRequestHeader => {
                    const consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => {})
                    
                    xhr.setDisableHeaderCheck(headerCheckDisabled)
                    expect(xhr.setRequestHeader(forbiddenRequestHeader, 'Test')).toBe(headerCheckDisabled)
                    
                    if (headerCheckDisabled) {
                        expect(consoleWarnSpy).not.toHaveBeenCalled()
                        
                        expect(xhr.getRequestHeader(forbiddenRequestHeader)).toBe('Test')
                    } else {
                        expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
                        expect(consoleWarnSpy).toHaveBeenCalledWith('Refused to set unsafe header \'' + forbiddenRequestHeader + '\'')
                    }

                    consoleWarnSpy.mockRestore()
            })
        })
    })

    test('Can set request header which is not forbidden', () => {
        const xhr = new XMLHttpRequest()

        xhr.readyState = OPENED

        const userAgent = 'Node browser'

        xhr.setRequestHeader('user-agent', userAgent)

        // test case variations
        const headerNameVariations = [
            'User-Agent',
            'User-agent',
            'user-Agent',
            'user-agent'
        ]

        for (const headerNameVariation of headerNameVariations) {
            expect(xhr.getRequestHeader(headerNameVariation)).toBe(userAgent)
        }
    })

    test('Can not set request header when request is being sent', () => {
        const xhr = new XMLHttpRequest()

        xhr.readyState = OPENED

        // Set internal _sendFlag to true to simulate a request being sent
        xhr._sendFlag = true

        expect(() => xhr.setRequestHeader('user-agent', 'Node browser'))
            .toThrow(new Error('INVALID_STATE_ERR: send flag is true'))
    })
})