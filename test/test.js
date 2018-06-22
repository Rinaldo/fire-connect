/* global jest */

import React from 'react'
// import renderer from 'react-test-renderer'
import { shallow } from 'enzyme'
import { fireEvent, render } from 'react-testing-library'

import 'jest-dom/extend-expect'

import { Provider, firestoreConnect, firebaseConnect, authConnect } from '../src'
// import { FireProvider } from '../app/fire-connect/provider'

jest.useFakeTimers()

const delay = data => callback => {setTimeout(callback, 1000, data)}
const userToken = { uid: 123 }
const authStub = { onAuthStateChanged: delay(userToken) }

const ToBeConnected = props => (
  <div>
    <p>Receives arbitrary props from context: {props.arbitraryProp}</p>
    <p>Receives the user prop: {props.user ? props.user.uid : 'no user yet'}</p>
    <p>Receives props passed to it: {props.passingIn}</p>
    <button onClick={props.click}>Click Me!</button>
  </div>
)


describe('Provider', () => {

  let wrapper
  beforeEach(() => {
    wrapper = shallow(<Provider auth={authStub} />)
  })
  afterEach(() => {
    jest.clearAllTimers()
  })
  test('provides a value prop to the context API provider', () => {
    expect(wrapper.find('[value]')).toHaveLength(1)
  })
  test('passes all props to context API provider', () => {
    wrapper = shallow(<Provider auth={authStub} arbitraryProp anotherProp />)
    expect(wrapper.find('[value]').props().value).toEqual({
      auth: authStub,
      arbitraryProp: true,
      anotherProp: true
    })
  })
  test('sets the user on state when the callback completes', () => {
    expect(wrapper.state().user).toBeUndefined()
    jest.runOnlyPendingTimers()
    expect(wrapper.state().user).toBe(userToken)
  })
  test('passes state to provider', () => {
    expect(wrapper.find('[value]').props().value).toEqual({ auth: authStub })
    jest.runOnlyPendingTimers()
    wrapper.update()
    expect(wrapper.find('[value]').props().value).toEqual({ auth: authStub, user: userToken })
  })
})


describe('Basic Firestore Integration', () => {

  const firestoreMessage = { message: 'Hello from Firestore!' }
  let mockUnsubscribe
  let mockCb
  let tree

  const firestoreStub = {
    onSnaphot: function(callback) {
      delay(firestoreMessage)(callback)
      return mockUnsubscribe
    }
  }


  describe('single listener', () => {
    const listenerStub = (connector, firestore) =>
      firestore.onSnaphot(mockCb)
    const FakeConnected = firestoreConnect(listenerStub)(ToBeConnected)

    beforeEach(() => {
      mockUnsubscribe = jest.fn()
      mockCb = jest.fn()
      tree = render(
        <Provider auth={authStub} firestore={firestoreStub} arbitraryProp="arbitrary">
          <FakeConnected passingIn="Hi There!" />
        </Provider>
      )
    })
    afterEach(() => {
      jest.clearAllTimers()
    })
    test('connected component receives props from context', () => {
      expect(tree.getByText(/^Receives arbitrary props from context:/).textContent).toBe('Receives arbitrary props from context: arbitrary')
    })
    test('connected component receives the user prop when it is loaded', () => {
      expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: no user yet')
      jest.runOnlyPendingTimers()
      expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: 123')
    })
    test('connected component receives props passed to it', () => {
      expect(tree.getByText(/^Receives props passed to it:/).textContent).toBe('Receives props passed to it: Hi There!')
    })
    test('listener is invoked, which invokes a firestore callback', () => {
      jest.runOnlyPendingTimers()
      expect(mockCb.mock.calls.length).toBe(1)
      expect(mockCb.mock.calls[0][0]).toBe(firestoreMessage)
    })
    test('return value from firestore (unsubscribe) is saved and invoked on umnount', () => {
      tree.unmount()
      expect(mockUnsubscribe.mock.calls.length).toBe(1)
    })
  })

  describe('multiple listeners', () => {
    const listenersStub = (connector, firestore) => ({
      listener1: () => firestore.onSnaphot(mockCb),
      listener2: () => firestore.onSnaphot(mockCb),
      listener3: () => firestore.onSnaphot(mockCb),
    })
    const FakeConnected2 = firestoreConnect(listenersStub)(ToBeConnected)

    beforeEach(() => {
      mockUnsubscribe = jest.fn()
      mockCb = jest.fn()
      tree = render(
        <Provider auth={authStub} firestore={firestoreStub} arbitraryProp="arbitrary">
          <FakeConnected2 passingIn="Hi There!" />
        </Provider>
      )
    })
    afterEach(() => {
      jest.clearAllTimers()
    })
    test('supports multiple listeners', () => {
      jest.runOnlyPendingTimers()
      expect(mockCb.mock.calls.length).toBe(3)
      tree.unmount()
      expect(mockUnsubscribe.mock.calls.length).toBe(3)
    })
  })
})


describe('Basic Firebase Integration', () => {

  const firebaseMessage = { message: 'Hello from Firebase!' }
  const someData = { data: true }
  let mockUnsubscribe
  let mockCb
  let mockSet
  let tree

  const firebaseStub = {
    ref() {
      return {
        on(type, callback) {
          delay(firebaseMessage)(callback)
          return callback
        },
        off() {
          mockUnsubscribe()
        },
        set(data) {
          mockSet(data)
        }
      }
    }
  }


  describe('single listener', () => {
    const listenerStub = (connector, ref) =>
      ref('/some/path').on('value', mockCb)
    // fireEvent doesn't seem to work so we can't test dispatchers
    const dispatcherStub = (connector, ref) => ({
      click() { ref().set(someData) }
    })
    const FakeConnected = firebaseConnect(listenerStub, dispatcherStub)(ToBeConnected)

    beforeEach(() => {
      mockUnsubscribe = jest.fn()
      mockCb = jest.fn()
      mockSet = jest.fn()
      tree = render(
        <Provider auth={authStub} database={firebaseStub} arbitraryProp="arbitrary">
          <FakeConnected passingIn="Hi There!" />
        </Provider>
      )
    })
    afterEach(() => {
      jest.clearAllTimers()
    })
    test('connected component receives props from context', () => {
      expect(tree.getByText(/^Receives arbitrary props from context:/).textContent).toBe('Receives arbitrary props from context: arbitrary')
    })
    test('connected component receives the user prop when it is loaded', () => {
      expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: no user yet')
      jest.runOnlyPendingTimers()
      expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: 123')
    })
    test('connected component receives props passed to it', () => {
      expect(tree.getByText(/^Receives props passed to it:/).textContent).toBe('Receives props passed to it: Hi There!')
    })
    test('listener is invoked, which invokes a firebase callback', () => {
      jest.runOnlyPendingTimers()
      expect(mockCb.mock.calls.length).toBe(1)
      expect(mockCb.mock.calls[0][0]).toBe(firebaseMessage)
    })
    test('return value from firebase (unsubscribe) is saved and invoked on umnount', () => {
      tree.unmount()
      expect(mockUnsubscribe.mock.calls.length).toBe(1)
    })
  })

  describe('multiple listeners', () => {
    const listenersStub = (connector, ref) => ({
      listener1: () => ref('/some/path').on('value', mockCb),
      listener2: () => ref('/some/path').on('value', mockCb),
      listener3: () => ref('/some/path').on('value', mockCb),
    })
    const FakeConnected = firebaseConnect(listenersStub)(ToBeConnected)

    beforeEach(() => {
      mockUnsubscribe = jest.fn()
      mockCb = jest.fn()
      tree = render(
        <Provider auth={authStub} database={firebaseStub} arbitraryProp="arbitrary">
          <FakeConnected passingIn="Hi There!" />
        </Provider>
      )
    })
    afterEach(() => {
      jest.clearAllTimers()
    })
    test('supports multiple listeners', () => {
      jest.runOnlyPendingTimers()
      expect(mockCb.mock.calls.length).toBe(3)
      tree.unmount()
      expect(mockUnsubscribe.mock.calls.length).toBe(3)
    })
  })
})


describe('Basic Auth Integration', () => {

  let tree

  const dispatcherStub = (connector, auth) => ({
    onClick() { console.log('in onClick');auth.someAuthMethod() }
  })
  // fireEvent doesn't seem to work so we can't test dispatchers
  const FakeConnected = authConnect(dispatcherStub)(ToBeConnected)

  beforeEach(() => {
    authStub.someAuthMethod = jest.fn()
    tree = render(
      <Provider auth={authStub} arbitraryProp="arbitrary">
        <FakeConnected passingIn="Hi There!" />
      </Provider>
    )
  })
  afterEach(() => {
    jest.clearAllTimers()
  })
  test('connected component receives props from context', () => {
    fireEvent.click(tree.getByText('Click Me!'))
    expect(tree.getByText(/^Receives arbitrary props from context:/).textContent).toBe('Receives arbitrary props from context: arbitrary')
  })
  test('connected component receives the user prop when it is loaded', () => {
    fireEvent.click(tree.getByText('Click Me!'))
    expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: no user yet')
    jest.runOnlyPendingTimers()
    expect(tree.getByText(/^Receives the user prop:/).textContent).toBe('Receives the user prop: 123')
  })
  test('connected component receives props passed to it', () => {
    fireEvent.click(tree.getByText('Click Me!'))
    expect(tree.getByText(/^Receives props passed to it:/).textContent).toBe('Receives props passed to it: Hi There!')
  })
  // test('connected component receives dispatchers properly', () => {
  //   fireEvent.click(tree.getByText('Click Me!'))
  //   expect(authStub.someAuthMethod.mock.calls.length).toBe(1)
  // })
})
