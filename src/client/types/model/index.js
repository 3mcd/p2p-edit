import EventEmitter from 'eventemitter3';
import { type } from 'ot-text-tp2';

import { create, noop } from '../../utils';
import wayback from '../wayback';

const proto = create(EventEmitter.prototype, {

    adapter(factory, ...args) {
        const sync = () => this._adapters.forEach((a) => a !== adapter ? a.update() : noop);
        const adapter = factory(this, sync, ...args);
        this._adapters.push(adapter);
        adapter.install();
    },

    sync() {
        this._adapters.forEach((a) => a.update());
    },

    import(model, history) {
        this.importModel(model);
        this.importHistory(history);
        this.sync();
    },

    broadcast(op, r) {
        const id = this.id;
        const parent = this._history.getRevision(r).parent;
        this.emit('broadcast', { op, r: parent });
    },

    remoteOp(parent, op) {
        if (parent === this._history.head) {
            this.submit(op, noop);
        } else {
            let sequence = this._history.getSequence(parent);
            if (sequence === null) {
                this.emit('resync');
                return;
            } else {
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

    submit(op, cb, r) {
        op = type.normalize(op);
        this._snapshot = type.apply(this._snapshot, op);
        cb(op, this._history.push(op, r));
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

    const obj = create(proto, props);

    EventEmitter.call(obj);

    obj._model = type.api(() => obj._snapshot, obj.submit.bind(obj));

    return obj;
};

export default model;