# p2p-edit

p2p-edit is a collaborative text editor powered by WebRTC and OT. Local operations to the document are reconciled by remote clients by use of a data structure called [text-tp2](https://github.com/ottypes/text-tp2).

This project is only a POC at this stage and will break often.

### Setup

```
git clone https://github.com/ericmcdaniel/p2p-edit
```

This application has two components; a signaling server and a client. The signaling server must communicate with peers in order to establish WebRTC connections between them.

### Client

The client is located at `dist/p2p-edit.js`. It is exported as a UMD module and is compatible with most module loaders.

##### `client()`

The method exported from the client module will create a new instance of the p2p-edit client. Client instances have a standard `EventEmitter` API and will emit the `'ready'` event when they are ready to create text models.

##### `client#model(id)`

Text models (documents) can be created or retrieved with the `client.model` method. Simple string identifiers are used to namespace documents. Models currently only implement simple inserts and deletes via their `insert` and `delete` methods, respectively.

Currently you must wait for the `'ready'` event on client instances before you create a model.

e.g.

```js
client.on('ready', () => {
    this.model = client.model('/' + this.room);
    // Install an adapter. More on that below.
    this.model.adapter(cmAdapter, this.editor);
});
```

A client can have multiple active models. When you make a change to the model (via adapter or API), the change is integrated into the text-tp2 structure and broadcast to other clients.

##### `client#adapter()`

The client can be extended with adapters to translate proprietary changes to work with text-tp2. An example adapter for the CodeMirror library can be found at `ex/client/cm-adapter.js`.

e.g. An example adapter with a 1-to-1 mapping to text-tp2 operations;

```js
function adapter(model, sync, dependency) {
    const handleChange = (change) => {
        if (change.type === 'delete') {
            model.delete(change.from, change.count);
        } else if (change.type === 'insert') {
            model.insert(pos[0], text);
        }

        sync();
    }

    const install = () => {
        dependency.on('change', handleChange);
        model.addListener('remoteOp', update);
    }

    const uninstall = () => {
        dependency.off('change', handleChange);
        model.removeListener('remoteOp', update);
    }

    const update = () => dependency.setValue(model.get());

    return { install, uninstall, update };
}
```

Adapters will be executed with the model, a `sync` function, and any additional arguments you pass to `client#adapter()`. They should return an object with `install`, `uninstall` and `update` functions.

The `update` function is triggered when handshake data from a peer is recieved, and when `sync` is called by other instances of the same adapter.

#### Server

Run `npm run signal` to start the signaling server.

#### Examples

Run `npm run ex` to run the example.

### Notes

There is currently little implemented in the way of concurrency control, so you're gonna have a bad time if two people are typing at once.