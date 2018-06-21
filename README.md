Fire Connect
==============

React bindings for [Firebase](https://firebase.google.com) and [Firestore](https://firebase.google.com/docs/firestore/).

Fire Connect aims to be a transparent, flexible set of higher order components to help separate firebase-related concerns from the rest of your application. It  uses the standard firebase and firestore syntax, removing the need to learn a new custom syntax and allowing users to follow along with Google's [documentation](https://firebase.google.com/docs/).

## Installation

```
npm i fire-connect
```

React Firebase requires **[React 16.3](https://github.com/facebook/react) and [Firebase 3](https://www.npmjs.com/package/firebase) or later.**

## Usage

### `firestoreConnect(addListeners, addDispatchers)`

Connects a React component to firestore and auth.

When invoked, wraps the passed in component in a connector component and gives the passed in component access to the connector's props, state, and context through props.

#### Example

```js
const MyComponent = ({ task, isLoaded, newTask }) => (
  /* some JSX */
)

const addListeners = (connector, firestore) => (
  firestore.collection('tasks').doc('taskId').onSnapshot(doc => {
      connector.setState({ task: doc.data(), isLoaded: true })
  })
)
const addDispatchers = (connector, firestore, user) = ({
  newTask(task) {
    firestore.collection('tasks').add({ ...task, authorId: user.uid })
  }
})

export default firestoreConnect(addListeners, addDispatchers)(MyComponent)
```
```js
// multiple listeners
const addListeners = (connector, firestore) => ({
  taskA: () => firestore.collection('tasks').doc('taskA').onSnapshot(doc => {
      connector.setState({ taskA: doc.data() })
  }),
  taskB: () => firestore.collection('tasks').doc('taskB').onSnapshot(doc => {
      connector.setState({ taskB: doc.data() })
  }),
})
```

#### Arguments

* [`addListeners(connector, firestore, user)`] Returns either a single listener or an object in which the value of each key is a nullary function that itself returns a listener.

* [`addDispatchers(connector, firestore, user)`] Returns an object containing functions that send updates to Firestore, these functions are passed to the wrapped component as props.

  * `connector` The `this` reference for the connector component. Can be used to access the connector's props (which includes everything passed to the provider) and call `setState`, among other things
  * `firestore` The firestore instance passed to the provider (`firebase.firestore()`)
  * `user` If `firebase.auth()` was passed to the provider, it is the user object or null. Else, it is `undefined`

#### Returns

A React component class that can be invoked with a component and will pass dispatchers, its state, its props, and its context as props to that component.

### `firebaseConnect(addListeners, addDispatchers)`

Connects a React component to Firebase and auth.

When invoked, wraps the passed in component in a connector component and gives the passed in component access to the connector's props, state, and context through props.

#### Example

```js
const MyComponent = ({ task, isLoaded, newTask }) => (
  /* some JSX */
)

const addListeners = (connector, ref) => (
  ref('tasks').onSnapshot('value', snapshot => {
      connector.setState({ task: snapshot.data(), isLoaded: true })
  })
)
const addDispatchers = (connector, ref, user) = ({
  newTask(task) {
    ref('tasks').push().set({ ...task, authorId: user.uid })
  }
})

export default firebaseConnect(addListeners, addDispatchers)(MyComponent)
```
```js
// multiple listeners
const addListeners = (connector, ref, user, setEventType) => ({
  taskA: () => ref('tasks/taskA').on(setEventType('value'), snapshot => {
      connector.setState({ taskA: snapshot.data() })
  }),
  taskB: () => ref('tasks/taskB').on('child_added', snapshot => {
      connector.setState({ taskA: snapshot.data() })
  }),
})
```
#### Arguments

* [`addListeners(connector, ref, user, setEventType)`] Returns either a single listener or an object in which the value of each key is a function that takes no arguments and itself returns a listener.
  > Note: `ref().child()` is not currently supported. Use string concatenation inside of `ref` instead.

* [`addDispatchers(connector, ref, user)`] Returns an object containing functions that send updates to Firebase, these functions are passed to the wrapped component as props.


  * `connector` The `this` reference for the connector component. Can be used to access the connector's props (which includes everything passed to the provider) and call `setState`, among other things
  * `ref` An internal function that returns the result of calling `firebase.database().ref` and stores the path passed in for unsubscribing when the component unmounts.
  * `user` If `firebase.auth()` was passed to the provider, it is the user object or null. Else, it is `undefined`
  * `setEventType` By default, firebaseConnect will call `.off()` with no arguments, removing all listeners at the location `ref` was called with. If this behavior causes problems, the first argument to `.on` (eventType) can be replaced with `setEventType` invoked with a firebase eventType. (See multiple listeners example above)

#### Returns

A React component class that can be invoked with a component and will pass dispatchers, its state, its props, and its context as props to that component.

### `authConnect(addDispatchers)`

Connects a React component to auth.

When invoked, wraps the passed in component in a connector component and gives the passed in component access to the connector's props and context through props.

Auth can also be accessed in firebaseConnect and firestoreConnect through `connector.props.auth`.

#### Example

```js
const MyComponent = ({ login, logout }) => (
  /* some JSX */
)

const addHostDispatchers = (connector, auth) => ({
  login() {
    auth.signInWithPopup(googleProvider)
    },
  logout() {
    auth.signOut()
  },
})

export default authConnect(addListeners, addDispatchers)(MyComponent)
```

#### Arguments

* [`addDispatchers(connector, auth, user)`] Returns an object containing functions that invoke auth methods, these functions are passed to the wrapped component as props.

  * `connector` The `this` reference for the connector component. Can be used to access the connector's props (which includes everything passed to the provider) and call `setState`, among other things
  * `auth` The firestore instance passed to the provider (`firebase.auth()`)
  * `user` If `firebase.auth()` was passed to the provider, it is the user object or null. Else, it is `undefined`

#### Returns

A React component class that can be invoked with a component and will pass dispatchers, its props, and its context as props to that component.

### `<Provider auth database firestore (anyOtherProps)>`

The `<Provider>` component wraps your application and uses the context API to pass auth, database, and firestore references to connected components, as well as any other data the connected components should have. If passed an auth prop, it will initialize an auth listener and pass connected components the resulting user object.

#### Props

* `auth` `firebase.auth()`.
* `database` `firebase.database()`.
* `firestore` `firebase.firestore()`.
* `children` (*ReactElement*): The root of your component hierarchy.
* `onIdTokenChanged` Boolean prop that toggles whether the auth listener is `onIdTokenChanged` or the default `onAuthStateChanged`.
* Any other props passed to `<Provider>` will be put in its context and accessible to connected components.

#### Example

```js
render(
  <Provider
    auth={firebase.auth()}
    database={firebase.database()}
    firestore={firebase.firestore()}
    firebaseTimestamp={firebase.database.ServerValue.TIMESTAMP}
  >
    <App />
  </Provider>,
  document.getElementById('app')
)
```

## FAQ

**Can I access firestore in firebaseConnect or firebase in firestoreConnect?**

Yes! The firebase reference can be found at `connector.props.database` and the firestore reference can be found at `connector.props.firestore`. You can use the firebase `once` method or firestore `get` method to fetch data and use any methods to add, update, or delete data. However, setting up listeners is not recommended as they will not be automatically unsubscribed when the component unmounts.

**Can I save a firebase ref or firestore docRef to a variable so I don't have to keep retypeing a long path?**

Yes! One way to do it is to set a property of the wrapper component in either `addListeners` or `addDispatchers`. Something like `connector.myRef = ref('some/really/long/path')`. If you're using a property in both `addListeners` and `addDispatchers`, it's better to declare it in `addDispatchers` as `addDispatchers` is invoked in the constructor and `addListeners` is invoked in `componentDidMount`.

## License

MIT

## Acknowledgements

[`react-firebase`](https://github.com/unfold/react-firebase)

[`react-redux-firebase`](https://github.com/prescottprue/react-redux-firebase)

[`react-redux`](https://github.com/reactjs/react-redux)
