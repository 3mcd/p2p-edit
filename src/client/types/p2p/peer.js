import EventEmitter from 'eventemitter3';

import connection from './connection';

import { c, uuid, stringify } from '../../utils';

const DEFAULT_SCOPE = '/';

const proto = c({

    send(msg, scope = DEFAULT_SCOPE) {
        if (!this._scopes[scope]) {
            return;
        }

        for (var cid in this._scopes[scope]) {
            this._scopes[scope][cid].send(msg);
        }
    },
    
    addConnection(config) {
        const { id, getMeta, scope } = config;
        const c = connection({ id, getMeta, pid: this.id, socket: this._socket });

        this._connections[id] = c;

        c.on('sdp', (sdp) => this.handleSDP(c, sdp));
        c.on('candidate', (sdp) => this.handleCandidate(c, sdp));

        if (scope) {
            this.addToScope(scope, c);
        }

        return c;
    },

    handleSDP(c, sdp) {
        const scope = this.getConnectionScope(c);
        this._socket.send(
            stringify({
                t: 'SDP',
                p: { cid: c.id, sdp, scope },
                dst: this.id
            })
        );
    },

    handleCandidate(c, candidate) {
        this._socket.send(
            stringify({
                t: 'ICE',
                p: { cid: c.id, candidate },
                dst: this.id
            })
        );
    },

    getConnectionScope(c) {
        for (var name in this._scopes) {
            for (var cid in this._scopes[name]) {
                if (this._scopes[name][cid] === c) {
                    return name;
                }
            }
        }
    },

    getConnection(cid) {
        if (this._connections[cid]) {
            return this._connections[cid];
        }
        return null;
    },

    addToScope(scope, c) {
        if (!this._scopes[scope]) {
            this._scopes[scope] = {};
        }

        console.log(scope);
        console.log(this._scopes[scope] = {});

        this._scopes[scope][c.id] = c;
    },

    destroy() {
        this.removeAllListeners();

        for (var prop in this._connections) {
            this._connections[prop].destroy();
        }
    }

}, EventEmitter.prototype);

const peer = function (config) {
    const { id, socket } = config;
    const props = {
        id,
        _socket: socket,
        _connections: {},
        _scopes: {}
    };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    return obj;
};

export default peer;