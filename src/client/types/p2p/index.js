import EventEmitter from 'eventemitter3';

import adapter from './adapter';
import peer from './peer';

import { create, stringify, uuid } from '../../utils';

const DEFAULT_SCOPE = '/';

adapter(window);

const createCandidate = ({ sdpMLineIndex, candidate } = c) =>
    new RTCIceCandidate({ sdpMLineIndex, candidate });

const createSDP = (sdp) => new RTCSessionDescription(sdp);
const onSDPError = (err) => console.error(err);

const proto = create(EventEmitter.prototype, {
    // Send a message to all peers, optionally peers in a specific scope.
    send(msg, scope = DEFAULT_SCOPE) {
        if (typeof msg !== 'string') {
            msg = stringify(msg);
        }
        
        for (var prop in this.peers) {
            this.peers[prop].send(msg, scope);
        }
    },

    // Request access to a scope.
    createScope(scope = DEFAULT_SCOPE, config = {}) {
        const { id, socket } = this;
        
        socket.send(stringify({
            t: 'OPEN',
            p: { id, scopes: [scope || DEFAULT_SCOPE] }
        }));

        if (config.getMeta) {
            this.metas[scope] = config.getMeta;
        }
    },

    // Triggers when a peer has requested to join one of our scopes
    handleOpen(msg) {
        const { src, p: { scope } } = msg;
        this.acceptRequest(src, scope);
    },

    handleClose(msg) {
        const { src } = msg;
        this.removePeer(src);
    },

    // Begin establishing a connection with peer by creating an offer. SDP and
    // ICE info will be sent over signalling server once available.
    acceptRequest(src, scope) {
        const { socket, id } = this;
        const p = this.addConnection({ pid: src, scope });
        p.offer();
    },

    addConnection(config) {
        const { pid, cid } = config;
        const { socket } = this;

        const scope = config.scope || DEFAULT_SCOPE;

        var p;

        if (this.peers[pid]) {
            p = this.peers[pid];
        } else {
            p = this.peers[pid] = peer({ id: pid, socket });
            p.on('close', (e) => this.removePeer(pid));
        }

        if (p._connections[cid]) {
            return;
        }
        
        const c = p.addConnection({ id: cid || uuid(), scope, getMeta: this.metas[scope] });

        c.on('data', (data) => this.emit('data', { scope, data: JSON.parse(data) }));

        return c;
    },

    removePeer(pid) {
        const p = this.peers[pid];

        // Peer may have closed from DataConnection close already.
        if (p) {
            p.destroy();
            delete this.peers[pid];
        }
    },

    // Recieved SDP info from remote peer.
    handleSDP(msg) {
        const { src, p: { cid, sdp, scope } } = msg;

        if (sdp.type === 'offer') {
            let c = this.addConnection({ pid: src, cid, scope });
            c.answer(sdp);
        } else if (sdp.type === 'answer') {
            this.peers[src].getConnection(cid).pc.setRemoteDescription(createSDP(sdp));
        } 
    },

    // Recieved ICE info from remote peer.
    handleICE(msg) {
        const { src, p: { cid, candidate } } = msg;

        const c = this.peers[src].getConnection(cid);

        if (c) {
            let candidates = this.candidates[cid];
            if (candidates) {
                for (var prop in candidates) {
                    for (var i = 0; i < candidates[prop].length; i++) {
                        c.pc.addIceCandidate(createCandidate(candidates[prop][i]));
                    }
                }
                delete candidates[prop];
            }
            c.pc.addIceCandidate(createCandidate(candidate));
        } else {
            if (!this.candidates[cid]) {
                this.candidates[cid] = [];
            }
            this.candidates[cid].push(candidate);
        }
    },

    handleScopeAvailable(msg) {
        const { name } = msg.p;
        this.emit('available', name);
    },

    onMessage(msg) {
        const { id, t } = msg;

        if (id === this.id) {
            return;
        }

        switch (t) {
            case 'OPEN': // Peer is requesting to connect
                this.handleOpen(msg);
                break;
            case 'CLOSE':
                this.handleClose(msg);
                break;
            case 'SDP': // SDP info from remote peer
                this.handleSDP(msg);
                break;
            case 'ICE': // ICE candidate from remote peer
                this.handleICE(msg);
                break;
            case 'SA': // Scope available
                this.handleScopeAvailable(msg);
                break;
            default:
                break;
        }
    },

    destroy() {
        this.socket.send(stringify({ t: 'CLOSE' }));
        for (var prop in this.peers) {
            let pid = this.peers[prop].id;
            this.removePeer(pid);
        }
        this.socket.close();
    }

});

const rtcClient = function (config) {
    const { id, server } = config;
    const peers = {};
    const metas = {}; // ew
    const candidates = [];


    if (!/^(https?|ws):\/\//.test(server)) {
        throw new Error('The server URL must contain a valid protocol.');
    }

    const socket = new WebSocket(server);

    const props = { id, socket, peers, metas, candidates };

    const obj = create(proto, props);

    EventEmitter.call(obj);

    socket.onopen = () => obj.emit('ready');
    socket.onmessage = (e) => obj.onMessage(JSON.parse(e.data));

    window.onunload = () => obj.destroy();

    return obj;
}

export default rtcClient;