import EventEmitter from 'eventemitter3';

import adapter from './adapter';
import scope from './scope';
import { c, stringify, assign, noop } from '../../utils';

const DEFAULT_SCOPE = '/';

adapter(window);

const isFirefox = !!navigator.mozGetUserMedia;
const isChrome = !!navigator.webkitGetUserMedia;

const STUN = {
    url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
};

const TURN = {
    url: 'turn:homeo@turn.bistri.com:80',
    credential: 'homeo'
};

const ICE = {
    iceServers: [STUN]
};

const OPTIONAL = {
    optional: [
        { RtcDataChannels: true },
        { DtlsSrtpKeyAgreement: true }
    ]
};

const OFFER_ANSWER_CONSTRAINTS = {
    mandatory: {
        OfferToReceiveAudio: false,
        OfferToReceiveVideo: false
    }
};

if (isChrome) {
    let test = /Chrom(e|ium)\/([0-9]+)\./;

    if (parseInt(navigator.userAgent.match(test)[2]) >= 28) {
        TURN.username = 'homeo';
    }

    ICE.iceServers = [STUN, TURN];
}

const createCandidate = ({ sdpMLineIndex, candidate } = c) =>
    new RTCIceCandidate({ sdpMLineIndex, candidate });

const createSDP = (sdp) => new RTCSessionDescription(sdp);

const onSDPError = (err) => console.error(err);

const proto = c(EventEmitter.prototype, {
    // Send a message to all peers, optionally peers in a specific scope.
    send(msg, config) {
        const scope = this.scopes[config.scope || DEFAULT_SCOPE];
        scope.send(msg);
    },

    // Request access to a scope.
    createScope(name = DEFAULT_SCOPE) {
        const { id, scopes, socket } = this;
        if (!scopes[name]) {
            scopes[name] = scope(name);
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

    // Triggers when a peer has requested to join one of our scopes.
    handleOpen(msg) {
        this.acceptRequest(msg.src);
    },

    // Begin establishing a connection with peer by creating an offer. SDP and
    // ICE info will be sent over signalling server once available.
    acceptRequest(src) {
        const { socket } = this;

        this.peers[src] = this.createOffer({
            onsdp: (sdp) => socket.send(
                stringify({
                    t: 'SDP',
                    p: { sdp },
                    dst: src
                })
            ),
            onicecandidate: (candidate) => socket.send(stringify({
                t: 'ICE',
                p: { candidate },
                dst: src
            }))
        });
    },

    // Recieved SDP info from remote peer.
    handleSDP(msg) {
        const { src, p: { sdp } } = msg;
        const { socket } = this;

        if (sdp.type === 'offer') {;
            this.peers[src] = this.createAnswer({
                sdp,
                onsdp: (sdp) => socket.send(
                    stringify({
                        t: 'SDP',
                        p: { sdp },
                        dst: src
                    })
                ),
                onicecandidate: (candidate) => socket.send(stringify({
                    t: 'ICE',
                    p: { candidate },
                    dst: src
                }))
            });
        } else if (sdp.type === 'answer') {
            this.peers[src].setRemoteDescription(createSDP(sdp));
        }

        this.peers[src].ondatachannel = (e) => window.channel = e.channel;
    },

    // Recieved ICE info from remote peer.
    handleICE(msg) {
        const { src, p: { candidate } } = msg;

        const peer = this.peers[src];

        if (peer) {
            peer.addIceCandidate(createCandidate(candidate));
            for (let i = 0; i < this.candidates.length; i++) {
                peer.addIceCandidate(createCandidate(this.candidates[i]));
            }
            this.candidates = [];
        } else this.candidates.push(this.candidates);
    },

    handleScopeAvailable(msg) {
        const { scope } = msg.p;
        if (scope === DEFAULT_SCOPE) {
            this.emit('ready', scope);
        }
    },

    // Accepted request to connect from peer. Create a new RTCPeerConnection for
    // the remote peer and send an offer. When an SDP is ready, call
    // setLocalDescription and `onsdp` callback. When an ICE candidate is ready,
    // call `onIceCandidate` callback.
    createOffer(config) {
        const peer = new RTCPeerConnection(ICE, OPTIONAL);

        const channel = window.channel = peer.createDataChannel('test', { reliable: true });

        channel.onmessage = (msg) => console.log(msg);
        channel.onerror = (err) => console.error("Channel Error:", err);

        peer.createOffer((sdp) => {
            peer.setLocalDescription(sdp);
            config.onsdp(sdp);
        }, onSDPError, OFFER_ANSWER_CONSTRAINTS);

        peer.onicecandidate = (e) => {
            console.log(e);
            if (e.candidate) {
                config.onicecandidate(e.candidate);
            }
        };

        return peer;
    },

    // Got SDP from remote client. Create a new RTCPeerConnection and send
    // answer.
    createAnswer(config) {
        const peer = new RTCPeerConnection(ICE, OPTIONAL);

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                config.onicecandidate(e.candidate);
            }
        };

        peer.setRemoteDescription(createSDP(config.sdp));

        peer.createAnswer((sdp) => {
            peer.setLocalDescription(sdp);
            config.onsdp(sdp);
        }, onSDPError, OFFER_ANSWER_CONSTRAINTS);

        return peer;
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
    }

});

const webRTCClient = function (config) {
    const { id } = config;
    const scopes = {};
    const peers = {};
    const candidates = [];
    const socket = new WebSocket('ws://' + document.domain + ':12034');

    const props = { id, scopes, socket, peers, candidates };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    socket.onopen = () => obj.createScope(DEFAULT_SCOPE);
    socket.onmessage = (e) => obj.onMessage(JSON.parse(e.data));


    return obj;
}

export default webRTCClient;