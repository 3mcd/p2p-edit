import EventEmitter from 'eventemitter3';

import model from './types/model';
import { c, noop, uuid } from './utils';
import webRTCClient from './types/p2p';
import cmAdapter from './adapters/codemirror';

const MESSAGE_TYPES = {
    OP: 'op'
};

const createMessage = (t, p) => ({ t, p });

const unpackMessage = (m) => m.p;

const proto = c({

    model(id, text) {
        if (this.models[id]) {
            return this.models[id];
        }
        const scope = this._RTC.createScope(id);
        const m = model(id, text);
        this.models[id] = m;
        m.on('broadcast', (payload) => this.broadcast(payload));
        m.on('resync', noop);
        scope.on('message', (...args) => this.onMessage(...args));
        return m;
    },

    broadcast(payload) {
        const msg = createMessage('op', payload);
        this._RTC.send(msg, { scope: payload.id });
    },

    handleOpPayload(payload) {
        const { id, op, r } = payload;
        this.models[id].remoteOp(r, op);
    },

    onMessage(msg) {
        const payload = unpackMessage(msg);
        switch (msg.type) {
            case 'op':
                this.handleOpPayload(payload);
                break;
            default:
                break;
        }
    }

}, EventEmitter.prototype);

const p2pedit = function (config = {}) {
    const id = config.id || uuid();
    const rtc = webRTCClient({ id });
    const props = {
        models: {},
        adapters: {
            CM: cmAdapter
        },
        _RTC: rtc
    };

    rtc.on('ready', () => this.emit('ready'));

    const obj = c(proto, props);

    EventEmitter.call(obj);

    window.client = obj;

    return obj;
}

export default p2pedit;