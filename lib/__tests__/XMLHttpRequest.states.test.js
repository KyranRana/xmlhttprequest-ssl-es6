import * as XMLHttpRequestStates from '../XMLHttpRequestStates'
import XMLHttpRequest from '../XMLHttpRequest'

describe("XMLHttpRequest state tests", () => {
    test.each`
    state
    ${'UNSENT'}
    ${'OPENED'}
    ${'HEADERS_RECEIVED'}
    ${'LOADING'}
    ${'DONE'}
    `("XMLHttpRequestStates.$state is equal to XMLHttpRequest.$state", ({ state }) =>
        expect(XMLHttpRequestStates[state]).toBe(XMLHttpRequest[state]))
})