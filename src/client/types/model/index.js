import EventEmitter from 'eventemitter3';
import { type } from 'ot-text-tp2';

import { create, noop } from '../../utils';
import history from '../history';

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

    broadcast(op, revision) {
        const rev = revision;
        const id = this.id;
        const l = this._history.get(revision).l;

        this.emit('broadcast', { id, l, op, rev });
    },

    remoteOp(payload) {
        const { l, op, rev } = payload;
        console.log(`Got revision: ${rev}`);
        if (l === this._history.head) {
            this.submit(op, noop);
        } else {
            let sequence = this._history.sequence(l);
            if (sequence === null) {
                console.log(`Missing revision: ${l}`);
                debugger;
                this.emit('resync');
                return;
            } else {
                console.log(`Catching up`);
                console.log(sequence);
                let composed = sequence.reduce(type.compose);

                this.submit(type.transform(op, composed, 'left'), noop, l, rev);
            }
        }
        this.emit('remoteOp', { op });
    },

    insert(index, text) {
        this._model.insert(index, text, (op, revision) => this.broadcast(op, revision));
    },

    delete(index, numChars) {
        this._model.remove(index, numChars, (op, revision) => this.broadcast(op, revision));
    },

    get() {
        return this._model.get();
    },

    submit(op, cb, parent = null, id = null) {
        op = type.normalize(op);
        this._snapshot = type.apply(this._snapshot, op);
        const revision = this._history.insert({ l: parent, data: op, id });
        cb(op, revision);
    },

    importModel(model) {
        this._snapshot = type.deserialize(model);
    },

    exportModel() {
        return type.serialize(this._snapshot);
    },

    importHistory(history) {
        this._history.import(history);
    },

    exportHistory() {
        return this._history.export();
    }

});

const model = function (id, text = '') {
    var _snapshot = type.create(text);
    
    const _history = history();

    const props = { id, _snapshot, _history, _adapters: [] };

    const obj = create(proto, props);

    EventEmitter.call(obj);

    obj._model = type.api(() => obj._snapshot, obj.submit.bind(obj));

    return obj;
};

export default model;