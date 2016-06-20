// https://www.webrtc-experiment.com/

// Dependencies:
// 1. WebSocket
// 2. Node-Static

// Features:
// 1. WebSocket over Nodejs connection
// 2. WebSocket scopes i.e. rooms

'use strict';

var fs = require('fs');

var Server = require('node-static').Server;
var file = new Server('./public');

// HTTP server
var app = require('http').createServer(function(request, response) {
    request.addListener('end', function() {
        file.serve(request, response);
    }).resume();
});

var WebSocketServer = require('websocket').server;

new WebSocketServer({
    httpServer: app,
    autoAcceptConnections: false
}).on('request', onRequest);

// shared stuff

const SERVER_IDENTIFIER = 's';

const scopes = {};
const clients = {};

const messageScopeAvailable = (name) => ({
    id: SERVER_IDENTIFIER,
    t: 'SA',
    p: { name }
});

const sendScopeAvailable = (name, ws) =>
    send(messageScopeAvailable(name), ws);

const sendDirectScopeAvailable = (name, ws) =>
    ws.sendUTF(JSON.stringify(messageScopeAvailable(name)));

function onRequest(socket) {
    var origin = socket.origin + socket.resource;

    var ws = socket.accept(null, origin);

    ws.on('message', (msg) => {
        if (msg.type === 'utf8') {
            onMessage(JSON.parse(msg.utf8Data), ws);
        }
    });

    // ws.on('close', () => onClose(ws))
}

function addClient (id, ws, scope) {
    console.log(`Adding client with id ${id} to scope ${scope}.`);

    if (!scopes[scope]) {
        scopes[scope] = {};
    }

    scopes[scope][id] = ws;
    clients[id] = ws;

    Object.keys(scopes, (scope) => sendScopeAvailable(scope, ws));

    sendDirectScopeAvailable(scope, ws);
}

function findClient (id) {
    for (var name in scopes) {
        if (id in scopes[name]) {
            return scopes[name][id];
        }
    }
    return null;
}

function getClientId (ws) {
    for (var id in clients) {
        if (ws === clients[id]) {
            return id;
        }
    }
}

function send(msg, ws) {
    ws = ws || null;

    if (!msg.p.scope && Array.isArray(msg.p.scopes)) {
        msg.p.scopes.forEach((scope) => {
            let m = Object.assign({}, msg);
            m.p.scope = scope;
            delete m.p.scopes;
            send(m, ws);
        });
        return;
    }

    const src = getClientId(ws);

    if (!src) {
        console.error('A message was sent from an unregistered client.');
        return;
    }

    msg.src = src;

    const data = JSON.stringify(msg);
    const dst = msg.dst;

    if (dst) {
        let client = clients[dst];
        if (client) {
            client.sendUTF(data);
            return;
        }
    }

    const scope = scopes[msg.p.scope];

    console.log(`${msg.t} to ${msg.p.scope}: ${JSON.stringify(msg.p)}`);

    if (scope === undefined) {
        console.error(`Message from ${src} was sent without a destination client or scope.`);
        return;
    } else if (!scope) {
        console.error(`The scope "${scope}" doesn't exist.`);
        return;
    }

    for (var prop in scope) {
        if (scope[prop] !== ws) {
            scope[prop].sendUTF(data);
        }
    }
}

// Add a client to one or more scopes and inform current members.
function onOpen(msg, ws) {
    const scopes = msg.p.scopes;
    scopes.forEach((scope) => {
        addClient(msg.p.id, ws, scope);
        send(msg, ws);
    });
}

function onClose(msg, ws) {
    const id = getClientId(ws);
    const client = clients[id];

    console.log(`Removing client with id ${id}.`);

    msg = Object.assign({ p: { scopes: [] } }, msg);

    for (var name in scopes) {
        if (id in scopes[name]) {
            msg.p.scopes.push(name);
        }
    }

    send(msg, ws);


    if (client && client.closeReasonCode === -1) {
        client.close();
        delete clients[id];
    }
}

function onMessage(msg, ws) {
    // console.log('Recieved message: ', msg);
    switch (msg.t) {
        case 'CP':
            checkPresence(msg, ws);
            break;
        case 'OPEN':
            onOpen(msg, ws);
            break;
        case 'CLOSE':
            onClose(msg, ws);
            break;
        default:
            send(msg, ws);
    }
}

function checkPresence(msg, ws) {
    ws.sendUTF(JSON.stringify({
        isScopePresent: !!scopes[msg.scope]
    }));
}

function swapArray(arr) {
    const swapped = [];

    for (var i = 0; i < arr.length; i++) {
        if (arr[i]) {
            swapped[swapped.length] = arr[i];
        }
    }

    return swapped;
}

app.listen(12034);

console.log('Please open NON-SSL URL: http://localhost:12034/');