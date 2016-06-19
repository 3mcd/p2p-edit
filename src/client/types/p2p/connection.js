import { c } from '../../utils';

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

const onSDPError = (err) => console.error(err);

const proto = {

    offer() {
        const peer = this.pc = new RTCPeerConnection(ICE, OPTIONAL);
        const channel = this.dc = peer.createDataChannel(this.cid, { reliable: true });

        // channel.onmessage = (msg) => console.log(msg);
        // channel.onerror = (err) => console.error("Channel Error:", err);

        peer.createOffer((sdp) => {
            peer.setLocalDescription(sdp);
            this.onsdp(sdp);
        }, onSDPError, OFFER_ANSWER_CONSTRAINTS);

        peer.onicecandidate = (e) => {
            console.log(e);
            if (e.candidate) {
                config.onicecandidate(e.candidate);
            }
        };

        return peer;
    },

    answer(config) {
        const peer = this.pc = new RTCPeerConnection(ICE, OPTIONAL);

        peer.onicecandidate = this.onicecandidate;

        peer.setRemoteDescription(createSDP(config.sdp));

        peer.createAnswer((sdp) => {
            peer.setLocalDescription(sdp);
            this.onsdp(sdp);
        }, onSDPError, OFFER_ANSWER_CONSTRAINTS);

        return peer;
    },

    onsdp(sdp) {
        this.socket.send(
            stringify({
                t: 'SDP',
                p: { sdp },
                dst: this.pid
            })
        );
    },

    onicecandidate(e) {
        if (e.candidate) {
            this.socket.send(
                stringify({
                    t: 'ICE',
                    p: { candidate },
                    dst: this.pid
                })
            );
        }
    }

};

const connection = function (config) {
    const { pid, cid = uuid(), socket } = config;
    const props = {
        cid,
        socket,
        pc: null,
        dc: null
    };

    const obj = c(proto, props);
};

export default connection;