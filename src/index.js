import React from 'react'

const fireContext = React.createContext()

const addListenersErrorMessage = 'return value of addListeners must be either a function (for one listener) or object (for multiple listeners)'
const multiListenerErrorMessage = 'The value of each key in the object returned from addListeners must be a function which takes no arguments and returns a listener'


class Provider extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    // Provider takes a boolean prop that changes the auth listener
    this.onChange = this.props.onIdTokenChanged ? 'onIdTokenChanged' : 'onAuthStateChanged'
  }

  componentDidMount() {
    this.unsubscribeAuth = this.props.auth && this.props.auth[this.onChange](user => this.setState({ user }))
  }
  // auth shouldn't change, but just in case it does...
  componentDidUpdate(prevProps) {
    if (prevProps.auth !== this.props.auth) {
      this.unsubscribeAuth && this.unsubscribeAuth()
      this.unsubscribeAuth = this.props.auth && this.props.auth[this.onChange](user => this.setState({ user }))
    }
  }

  componentWillUnmount() {
    this.unsubscribeAuth && this.unsubscribeAuth()
  }

  render() {
    return (
      <fireContext.Provider value={{ ...this.props, ...this.state }}>
        {this.props.children}
      </fireContext.Provider>
    )
  }
}


const contextConnector = Connector =>
  (listeners, dispatchers) =>
    ConnectedComponent =>
      class WithContext extends React.Component {
        render() {
          return (
            <fireContext.Consumer>
              {context => (
                <Connector
                  {...context}
                  listeners={listeners}
                  dispatchers={dispatchers}
                  {...this.props}
                  __render={stuff => <ConnectedComponent {...stuff} />}
                />
              )}
            </fireContext.Consumer>
          )
        }
      }


class FirebaseConnect extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.dispatchers = typeof this.props.dispatchers === 'function'
      ? this.props.dispatchers(this, this.props.database.ref.bind(this.props.database), this.props.user)
      : {}
    this.spyRef = this.spyRef.bind(this)
    this.setEventType = this.setEventType.bind(this)
    this.fireRefs = []
    this.eventTypes = []
    this.callbacks = []
  }

  spyRef(path) {
    const fireRef = this.props.database.ref(path)
    this.fireRefs.push(fireRef)
    return fireRef
  }

  setEventType(type) {
    this.eventTypes.push(type)
    return type
  }

  componentDidMount() {
    if (this.props.listeners) {
      const listenerResult = this.props.listeners(this, this.spyRef, this.props.user, this.setEventType)
      if (typeof listenerResult === 'function') {
        this.callbacks.push(listenerResult)
        if (!this.eventTypes.length) this.eventTypes.push(null)
      } else if (typeof listenerResult === 'object' && listenerResult !== null) {
        Object.values(listenerResult).forEach((listener, index) => {
          let callback
          try {
            callback = listener()
          } catch (err) {
            if (err.name === 'TypeError') err.message += '\n' + multiListenerErrorMessage
            throw err
          }
          if (typeof callback !== 'function') throw new TypeError(multiListenerErrorMessage)
          this.callbacks.push(callback)
          if (this.eventTypes.length <= index) {
            this.eventTypes.push(null)
          }
        })
      } else {
        throw new TypeError(addListenersErrorMessage)
      }
    }
  }

  componentWillUnmount() {
    this.fireRefs.forEach((ref, index) => {
      if (this.eventTypes[index]) ref.off(this.eventTypes[index], this.callbacks[index])
      else ref.off()
    })
  }

  render() {
    return (
        <>
          {this.props.__render({ ...this.dispatchers, ...this.props, ...this.state })}
        </>
    )
  }
}


class FirestoreConnect extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.dispatchers = typeof this.props.dispatchers === 'function'
      ? this.props.dispatchers(this, this.props.firestore, this.props.user)
      : {}
    this.unsubscribers = []
  }

  componentDidMount() {
    if (this.props.listeners) {
      const listenerResult = this.props.listeners(this, this.props.firestore, this.props.user)
      if (typeof listenerResult === 'function') {
        this.unsubscribers = [listenerResult]
      } else if (typeof listenerResult === 'object' && listenerResult !== null) {
        Object.values(listenerResult).forEach(listener => {
          let unsubscriber
          try {
            unsubscriber = listener()
          } catch (err) {
            if (err.name === 'TypeError') err.message += '\n' + multiListenerErrorMessage
            throw err
          }
          if (typeof unsubscriber !== 'function') throw new TypeError(multiListenerErrorMessage)
          this.unsubscribers.push(unsubscriber)
        })
      } else {
        throw new TypeError(addListenersErrorMessage)
      }
    }
  }

  componentWillUnmount() {
    this.unsubscribers.forEach(unsubscribe => {
      unsubscribe()
    })
  }

  render() {
    return (
        <>
          {this.props.__render({ ...this.dispatchers, ...this.props, ...this.state })}
        </>
    )
  }
}


class AuthConnect extends React.Component {
  constructor(props) {
    super(props)
    this.dispatchers = typeof this.props.dispatchers === 'function'
      ? this.props.dispatchers(this, this.props.auth, this.props.user)
      : {}
    this.unsubscribers = []
  }
  render() {
    return (
        <>
          {this.props.__render({ ...this.dispatchers, ...this.props })}
        </>
    )
  }
}


export { Provider }
export const firebaseConnect = contextConnector(FirebaseConnect)
export const firestoreConnect = contextConnector(FirestoreConnect)
export const authConnect = contextConnector(AuthConnect).bind(null, null)
