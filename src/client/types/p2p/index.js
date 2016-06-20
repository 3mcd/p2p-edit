import EventEmitter from 'eventemitter3';

import adapter from './adapter';
import peer from './peer';
import { c, stringify, assign, noop } from '../../utils';

const DEFAULT_SCOPE = '/';

adapter(window);

const createCandidate = ({ sdpMLineIndex, candidate } = c) =>
    new RTCIceCandidate({ sdpMLineIndex, candidate });

const createSDP = (sdp) => new RTCSessionDescription(sdp);
const onSDPError = (err) => console.error(err);

const proto = c(EventEmitter.prototype, {
    // Send a message to all peers, optionally peers in a specific scope.
    send(msg, config = {}) {
        const scope = this.scopes[config.scope || DEFAULT_SCOPE];
        
        if (!scope) {
            return;
        }

        if (typeof msg !== 'string') {
            msg = stringify(msg);
        }

        for (var prop in scope) {
            scope[prop].send(msg);
        }
    },

    // Request access to a scope.
    createScope(name = DEFAULT_SCOPE, config = {}) {
        const scope = this.scopes[config.scope || DEFAULT_SCOPE];
        
        if (scope) {
            return scope;
        }

        const { id, scopes, socket } = this;

        console.log(name, config);

        if (!scopes[name]) {
            scopes[name] = {};
            if (config.getMeta) {
                this.metas[name] = config.getMeta;
            }
            // Send a message to the signalling server to add self to a scope.
            // Clients in the same scope will recieve this message and respond
            // with an offer.
            socket.send(stringify({
                t: 'OPEN',
                p: { id, scopes: [name] }
            }));
        }

        return scopes[name];
    },

    // Triggers when a peer has requested to join one of our scopes
    handleOpen(msg) {
        const { src, p: { scope } } = msg;
        this.acceptRequest(src, scope);
    },

    handleClose(msg) {
        const { src } = msg;
        this.removePeer(msg.src);
    },


    // Begin establishing a connection with peer by creating an offer. SDP and
    // ICE info will be sent over signalling server once available.
    acceptRequest(src, scope) {
        const { socket, id } = this;
        const p = this.addPeer(src, scope);
        p.offer();
    },

    addPeer(pid, scope = DEFAULT_SCOPE) {
        const { socket } = this;
        const p = this.peers[pid] = peer({ socket, pid, getMeta: this.metas[scope] });
        this.scopes[scope][pid] = p;
        p.on('data', (data) => this.emit('data', { scope, data: JSON.parse(data) }));
        p.on('close', (e) => this.removePeer(pid));
        return p;
    },

    removePeer(pid) {
        const peer = this.peers[pid];
        peer.removeAllListeners();
        this.destroyPeerConnection(pid);
    },

    // Recieved SDP info from remote peer.
    handleSDP(msg) {
        const { src, p: { sdp } } = msg;

        if (sdp.type === 'offer') {
            let p = this.addPeer(src);
            p.answer(sdp);
        } else if (sdp.type === 'answer') {
            this.peers[src].pc.setRemoteDescription(createSDP(sdp));
        } 
    },

    // Recieved ICE info from remote peer.
    handleICE(msg) {
        const { src, p: { candidate } } = msg;

        const peer = this.peers[src];

        if (peer) {
            let candidates = this.candidates[src];
            if (candidates) {
                for (var prop in candidates) {
                    for (var i = 0; i < candidates[prop].length; i++) {
                        peer.pc.addIceCandidate(createCandidate(candidates[prop][i]));
                    }
                }
                delete candidates[prop];
            }
            peer.pc.addIceCandidate(createCandidate(candidate));
        } else {
            if (!this.candidates[src]) {
                this.candidates[src] = [];
            }
            this.candidates[src].push(candidate);
        }
    },

    handleScopeAvailable(msg) {
        const { name } = msg.p;
        this.emit('available', name);
    },

    onMessage(msg) {
        const { id, t } = msg;

        console.log(msg);

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
            this.removePeer(pid);
        }
        this.socket.close();
    },

    destroyPeerConnection(pid) {
        this.peers[pid].destroy();
        delete this.peers[pid];
        for (var prop in this.scopes) {
            if (pid in this.scopes[prop]) {
                delete this.scopes[prop][pid];
            }
        }
    }

});

const webRTCClient = function (config) {
    const { id } = config;
    const scopes = {};
    const peers = {};
    const metas = {}; // ew
    const candidates = [];
    const socket = new WebSocket('ws://' + document.domain + ':12034');

    const props = { id, scopes, socket, peers, metas, candidates };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    socket.onopen = () => obj.emit('ready');
    socket.onmessage = (e) => obj.onMessage(JSON.parse(e.data));

    window.onunload = () => obj.destroy();

    return obj;
}

export default webRTCClient;