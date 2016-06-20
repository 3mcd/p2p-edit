import EventEmitter from 'eventemitter3';

import model from './types/model';
import { c, noop, uuid } from './utils';
import webRTCClient from './types/p2p';
import cmAdapter from './adapters/codemirror';

const DEFAULT_SCOPE = '/';

const MESSAGE_TYPES = {
    OP: 'op'
};

const createMessage = (t, p) => ({ t, p });

const proto = c({

    model(id, text) {
        if (this.models[id]) {
            return this.models[id];
        }

        const m = model(id, text);
        this.models[id] = m;

        m.on('broadcast', (payload) => this.broadcast(payload));
        m.on('resync', noop);

        this._RTC.createScope(id, {
            getMeta: () => ({
                model: m.exportModel(),
                history: m.exportHistory()
            })
        });
        this._RTC.on('data', (...args) => this.handleMessage(...args));

        return m;
    },

    broadcast(p) {
        const msg = createMessage('op', p);
        this._RTC.send(msg, { scope: p.id });
    },

    handleOpPayload(p) {
        const { id, op, r } = p;
        this.models[id].remoteOp(r, op);
    },

    handleMeta(p, id) {
        const { model, history } = p;
        this.models[id].importModel(model);
        this.models[id].importHistory(history);
    },

    handleMessage(msg) {
        const { scope, data } = msg;
        console.log(msg);
        switch (data.t) {
            case 'op':
                this.handleOpPayload(data.p);
                break;
            case 'meta':
                this.handleMeta(data.p, msg.scope);
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

    const obj = c(proto, props);

    rtc.on('ready', () => {
        obj.model(DEFAULT_SCOPE);
        obj.emit('ready');
    });

    EventEmitter.call(obj);

    window.client = obj;

    return obj;
}

export default p2pedit;