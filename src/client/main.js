import EventEmitter from 'eventemitter3';

import model from './types/model';
import rtcClient from './types/p2p';

import { create, noop, uuid } from './utils';

/**
 * The default model identifier.
 * @type {String}
 */
const DEFAULT_MODEL = '/';

/**
 * Types of messages sent from peers.
 * @type {Object}
 */
const MESSAGE_TYPES = {
    OP: 'op',    // Broadcast from remote models.
    META: 'meta' // Sent from rtcClient connections once established.
};

/**
 * Create a message with a given message type and payload.
 * @param  {String} t A valid type from MESSAGE_TYPES.
 * @param  {Object} p Data to send.
 */
const createMessage = (t, p) => ({ t, p });

/**
 * The public p2pedit API. Inherits from EventEmitter.
 * @type {Object}
 */
const proto = create({
    /**
     * Retrieve an existing or new text model. The text model contains the
     * snapshot of the current state of the document and methods to integrate
     * TP2 operations.
     * @param  {String} id   Model identifier. Optional.
     * @param  {String} text Initial text of the model. Optional.
     * @return {Object}      Text model.
     */
    model(id = DEFAULT_MODEL, text = '') {
        // If a text model with the id exists, return it.
        if (this._models[id]) {
            return this._models[id];
        }

        // Create a new text model.
        const m = model(id, text);

        this._models[id] = m;

        // Set up listeners for the model.
        // When the model is updated locally, it will emit a broadcast event
        // with an operation.
        m.on('broadcast', (payload) => this.broadcastOp(payload));
        // TODO: Implement concurrency control.
        // Get sequence on remote client between head and op.
        m.on('resync', noop);

        // Connect to a scope on the server. This method will create the scope
        // on the signaling server if it doesn't exist and place our WebSocket
        // connection within it. Future clients connecting to the same scope
        // will be connected to our client.
        this._RTC.createScope(id, {
            // getMeta is executed every time a client in this scope connects to
            // us. We use it to send the initial snapshot and revision history
            // of our model.
            getMeta: () => createMessage(MESSAGE_TYPES.META, {
                model: m.exportModel(),
                history: m.exportHistory()
            })
        });

        return m;
    },

    /**
     * Broadcast an operation to clients editing the same model.
     * @param  {Object} payload Data to send.
     * @param  {String} id      Model identifier.
     */
    broadcastOp(payload) {
        const msg = createMessage(MESSAGE_TYPES.OP, payload);
        this._RTC.send(msg, payload.id);
    },

    /**
     * Apply a remote operation to a specific model.
     * @param  {Object} p Message payload from peer.
     */
    handleOp(payload) {
        // Apply remote operation to model.
        this._models[payload.id].remoteOp(payload);
    },

    /**
     * Import snapshot and history from peer.
     * @param  {Object} payload Text model and history data from peer.
     * @param  {String} id      Model identifier.
     */
    handleMeta(payload, id) {
        const { model, history } = payload;
        this._models[id].import(model, history);
    },

    /**
     * Redirect a message from peer to the appropriate procedure.
     * @param  {Object} msg Message from peer.
     */
    handleMessage(msg) {
        const { scope, data } = msg;

        console.log(data);

        switch (data.t) {
            case MESSAGE_TYPES.OP:
                this.handleOp(data.p);
                break;
            case MESSAGE_TYPES.META:
                this.handleMeta(data.p, msg.scope);
                break;
            default:
                break;
        }
    }
}, EventEmitter.prototype);

/**
 * p2pedit constructor
 * @param  {Object} config Configuration object.
 * @return {Object}        p2pedit instance.
 */
const p2pedit = function (config = {}) {
    const id = config.id || uuid();
    const server = config.server;
    const rtc = rtcClient({ id, server });
    const props = {
        _models: {},
        _RTC: rtc
    };

    const obj = create(proto, props);

    EventEmitter.call(obj);

    // Bubble up `ready` event from rtcClient.
    rtc.on('ready', () => obj.emit('ready'));
    // Handle messages from peers.
    rtc.on('data', (...args) => obj.handleMessage(...args));

    return obj;
}

export default p2pedit;