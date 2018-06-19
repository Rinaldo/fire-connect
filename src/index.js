import React from 'react'

const fireContext = React.createContext()


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


const baseStoreContextConnector = Connector =>
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
// same as above except only takes a dispatchers argument instead of both listeners and dispatchers
const authContextConnector = Connector =>
  (authDispatchers) =>
    ConnectedComponent =>
      class WithContext extends React.Component {
        render() {
          return (
            <fireContext.Consumer>
              {context => (
                <Connector
                  {...context}
                  authDispatchers={authDispatchers}
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
      } else if (listenerResult && typeof listenerResult === 'object') {
        Object.values(listenerResult).forEach((listener, index) => {
          this.callbacks.push(listener())
          if (this.eventTypes.length <= index) {
            this.eventTypes.push(null)
          }
        })
      } else {
        throw new TypeError('return value of addListeners must be either a function (for one listener) or object (for multiple listeners)')
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
      } else if (listenerResult && typeof listenerResult === 'object') {
        Object.values(listenerResult).forEach(listener => {
          this.unsubscribers.push(listener())
        })
      } else {
        throw new TypeError('return value of addListeners must be either a function (for one listener) or object (for multiple listeners)')
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
    this.state = {}
    this.authDispatchers = typeof this.props.authDispatchers === 'function'
      ? this.props.authDispatchers(this, this.props.auth, this.props.user)
      : {}
    this.unsubscribers = []
  }
  render() {
    return (
        <>
          {this.props.__render({ ...this.authDispatchers, ...this.props, ...this.state })}
        </>
    )
  }
}


export { Provider }
export const firebaseConnect = baseStoreContextConnector(FirebaseConnect)
export const firestoreConnect = baseStoreContextConnector(FirestoreConnect)
export const authConnect = authContextConnector(AuthConnect)
