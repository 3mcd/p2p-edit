import EventEmitter from 'eventemitter3';
import { type } from 'ot-text-tp2';

import { c, noop } from '../../utils';
import wayback from '../wayback';

const proto = c(EventEmitter.prototype, {

    adapter(a, ...args) {
        const sync = () => this._adapters.forEach((a) => a !== spec ? a.update() : noop);
        const spec = a(this, sync, ...args);
        this._adapters.push(spec);
        spec.install();
    },

    broadcast(op, r) {
        const id = this.id;
        const parent = this._history.getRevision(r).parent;
        this.emit('broadcast', { id, op, r: parent });
    },

    remoteOp(parent, op) {
        console.log(parent, this._history.head);
        if (parent === this._history.head) {
            this.submit(op, noop);
        } else {
            let sequence = this._history.getSequence(parent);
            // snapshot is out of date
            if (sequence === null) {
                this.emit('resync');
                return;
            } else {
                // operation is out of date
                let composedSequence = sequence.reduce(type.compose);
                this.submit(type.transform(op, composedSequence, 'left'), noop);
            }
        }
        this.emit('remoteOp', { op });
    },

    insert(index, text) {
        this._model.insert(index, text, (op, r) => this.broadcast(op, r));
    },

    delete(index, numChars) {
        this._model.remove(index, numChars, (op, r) => this.broadcast(op, r));
    },

    get() {
        return this._model.get();
    },

    submit(op, cb) {
        op = type.normalize(op);
        this._snapshot = type.apply(this._snapshot, op);
        cb(op, this._history.push(op));
    },

    importModel(model) {
        this._snapshot = type.deserialize(model);
    },

    exportModel() {
        return type.serialize(this._snapshot);
    },

    importHistory(h) {
        this._history.importModel(h);
    },

    exportHistory() {
        return this._history.exportModel();
    }

});

const model = function (id, text = '') {
    var _snapshot = type.create(text);
    
    const _history = wayback();

    const props = { id, _snapshot, _history, _adapters: [] };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    obj._model = type.api(() => obj._snapshot, obj.submit.bind(obj));

    return obj;
};

export default model;