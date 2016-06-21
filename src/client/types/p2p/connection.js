import EventEmitter from 'eventemitter3';

import { c, uuid, stringify, noop } from '../../utils';

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

const createSDP = (sdp) => new RTCSessionDescription(sdp);
const handleSDPError = (err) => console.error(err);

const proto = c({

    offer() {
        const pc = this.pc;
        const dc = pc.createDataChannel(this.id, { reliable: true });
        
        this.setDataChannel(dc);

        dc.onopen = () => this.dc.send(stringify({ t: 'meta', p: this.getMeta() || {} }));

        pc.createOffer((sdp) => {
            this.onsdp(sdp);
        }, handleSDPError, OFFER_ANSWER_CONSTRAINTS);

        pc.onicecandidate = (sdp) => this.onicecandidate(sdp);

        return this;
    },

    answer(sdp) {
        const pc = this.pc;

        pc.onicecandidate = (e) => this.onicecandidate(e);

        pc.setRemoteDescription(createSDP(sdp));

        pc.createAnswer((sdp) => this.onsdp(sdp), handleSDPError, OFFER_ANSWER_CONSTRAINTS);

        return this;
    },

    setDataChannel(dc) {
        this.dc = dc;
        dc.onmessage = (msg) => this.emit('data', msg.data);
    },

    send(msg) {
        if (!this.dc) {
            this.messages.push(msg);
            return;
        }

        this.dc.send(msg);

        this.messages.forEach((msg) => this.dc.send(msg));
        this.messages = [];
    },

    onsdp(sdp) {
        this.pc.setLocalDescription(sdp);
        this.emit('sdp', sdp);
    },

    onicecandidate(e) {
        const { candidate } = e;
        if (candidate) {
            this.emit('candidate', candidate);
        }
    },

    destroy() {
        this.removeAllListeners();
        
        if (this.dc) {
            this.dc.close();
        }

        if (this.pc) {
            this.pc.close();
        }
    }

}, EventEmitter.prototype);

const connection = function (config) {
    const pc = new RTCPeerConnection(ICE, OPTIONAL);
    const messages = [];

    const { id, pid } = config;
    const props = { id, pid, pc, messages, getMeta: config.getMeta || noop, dc: null };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    pc.ondatachannel = (e) => obj.setDataChannel(e.channel);
    // TODO: below
    pc.onclose = (e) => this.emit('close', e);

    return obj;
};

export default connection;