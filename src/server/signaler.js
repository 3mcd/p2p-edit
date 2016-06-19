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

var scopes = {};

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

    ws.on('close', () => truncateScopes(ws))
}

function addClient (scope, client) {
    console.log(`Adding client with id ${client} to scope ${scope}.`);
    const id = client.id;
    const ws = client.ws;

    if (scopes[scope]) {
        if (!scopes[scope].find((client) => client.id === id)) {
            scopes[scope].push(client);
        }
    } else {
        scopes[scope] = [client];
        Object.keys(scopes, (scope) => sendScopeAvailable(scope, ws));
    }

    console.log('Sending scope available:', scope);

    sendDirectScopeAvailable(scope, ws);
}

function findClient (id) {
    for (var prop in scopes) {
        for (var j = 0; j < scopes[prop].length; j++) {
            if (scopes[prop][j].id === id) {
                return scopes[prop][j];
            }
        }
    }
    return null;
}

function findClientByWS (ws) {
    for (var prop in scopes) {
        for (var j = 0; j < scopes[prop].length; j++) {
            if (scopes[prop][j].ws === ws) {
                return scopes[prop][j];
            }
        }
    }
    return null;
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

    const srcClient = findClientByWS(ws);

    if (!srcClient) {
        console.error('A message was sent from an unregistered client.');
        return;
    }

    const src = srcClient.id;

    msg.src = src;

    const data = JSON.stringify(msg);
    const dst = msg.dst;

    if (dst) {
        let client = findClient(dst);
        if (client) {
            client.ws.sendUTF(data);
            return;
        }
    }

    const scope = scopes[msg.p.scope];

    if (scope === undefined) {
        console.error(`Message from ${src} was sent without a destination client or scope.`);
        return;
    } else if (!scope) {
        console.error(`The scope "${scope}" doesn't exist.`);
        return;
    }

    for (var i = 0; i < scope.length; i++) {
        if (scope[i] && scope[i].ws !== ws) {
            try {
                scope[i].ws.sendUTF(data);
            } catch(e) { }
        }
    }
}

// Add a client to one or more scopes and inform current members.
function onOpen(msg, ws) {
    const scopes = msg.p.scopes;
    scopes.forEach((scope) => {
        const client = { ws, id: msg.p.id };
        addClient(scope, client);
        send(msg, ws);
    });
}

function onMessage(msg, ws) {
    console.log('Recieved message: ', msg);
    switch (msg.t) {
        case 'CP':
            checkPresence(msg, ws);
            break;
        case 'OPEN':
            onOpen(msg, ws);
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

function truncateScopes(websocket) {
    for (var name in scopes) {
        let scope = scopes[name];
        for (let i = 0; i < scope.length; i++) {
            if (scope[i] === websocket) {
                delete scope[i];
            }
        }
        scopes[name] = swapArray(scope);
        if (scopes && scopes[name] && !scopes[name].length) {
            delete scopes[name];
        }
    }
}

app.listen(12034);

console.log('Please open NON-SSL URL: http://localhost:12034/');