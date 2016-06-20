# p2p-edit

p2p-edit is a collaborative text editor powered by WebRTC and OT. Local operations to the document are reconciled by remote clients by use of a data structure called [text-tp2](https://github.com/ottypes/text-tp2).

This project is only a POC at this stage and will break often.

### Setup

```
git clone https://github.com/ericmcdaniel/p2p-edit
```

This application has two components; a signaling server and a client. The signaling server must communicate with the connected clients in order to establish WebRTC connections between them.

#### Client

`dist/p2p-edit.js`

The client is exported as a UMD module and is compatible with most module loaders.

The client can be extended with adapters to work with text-tp2. An example adapter for the CodeMirror library can be found in the `src/client/adapters.js` folder.

Text models can be created with the `client.model` method. Currentlly you must wait for the `'ready'` event on the client before you create a model. A page/client can have multiple active models. When you make a change to the model (via adapter or API), the change is integrated into the text-tp2 structure and broadcast to other clients.

There is currently little implemented in the way of concurrency control, so you're gonna have a bad time if two people are typing at once.

#### Server

`node src/server/signaler.js`

#### Examples

Run `node src/server/signaler.js & npm run ex` to run the example.