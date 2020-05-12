import XMLHttpRequest from '../main/XMLHttpRequest'

describe('XMLHttpRequest dispatchEvent tests', () => {
    test('dispatching an event', () => {
        const xhr = new XMLHttpRequest()

        const readystateCallback = jest.fn()

        xhr.onreadystatechange = readystateCallback
        xhr.addEventListener('readystatechange', readystateCallback)

        xhr.dispatchEvent('readystatechange')

        expect(readystateCallback.mock.calls.length).toBe(2)
    })
})