(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _eventemitter = __webpack_require__(1);

	var _eventemitter2 = _interopRequireDefault(_eventemitter);

	var _model2 = __webpack_require__(2);

	var _model3 = _interopRequireDefault(_model2);

	var _p2p = __webpack_require__(9);

	var _p2p2 = _interopRequireDefault(_p2p);

	var _utils = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * The default model identifier.
	 * @type {String}
	 */
	var DEFAULT_MODEL = '/';

	/**
	 * Types of messages sent from peers.
	 * @type {Object}
	 */
	var MESSAGE_TYPES = {
	    OP: 'op', // Broadcast from remote models.
	    META: 'meta' // Sent from rtcClient connections once established.
	};

	/**
	 * Create a message with a given message type and payload.
	 * @param  {String} t A valid type from MESSAGE_TYPES.
	 * @param  {Object} p Data to send.
	 */
	var createMessage = function createMessage(t, p) {
	    return { t: t, p: p };
	};

	/**
	 * The public p2pedit API. Inherits from EventEmitter.
	 * @type {Object}
	 */
	var proto = (0, _utils.create)({
	    /**
	     * Retrieve an existing or new text model. The text model contains the
	     * snapshot of the current state of the document and methods to integrate
	     * TP2 operations.
	     * @param  {String} id   Model identifier. Optional.
	     * @param  {String} text Initial text of the model. Optional.
	     * @return {Object}      Text model.
	     */

	    model: function model() {
	        var _this = this;

	        var id = arguments.length <= 0 || arguments[0] === undefined ? DEFAULT_MODEL : arguments[0];
	        var text = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

	        // If a text model with the id exists, return it.
	        if (this._models[id]) {
	            return this._models[id];
	        }

	        // Create a new text model.
	        var m = (0, _model3.default)(id, text);

	        this._models[id] = m;

	        // Set up listeners for the model.
	        // When the model is updated locally, it will emit a broadcast event
	        // with an operation.
	        m.on('broadcast', function (payload) {
	            return _this.broadcastOp(payload, m.id);
	        });
	        // TODO: Implement concurrency control.
	        m.on('resync', _utils.noop);

	        // Connect to a scope on the server. This method will create the scope
	        // on the signaling server if it doesn't exist and place our WebSocket
	        // connection within it. Future clients connecting to the same scope
	        // will be connected to our client.
	        this._RTC.createScope(id, {
	            // getMeta is executed every time a client in this scope connects to
	            // us. We use it to send the initial snapshot and revision history
	            // of our model.
	            getMeta: function getMeta() {
	                return createMessage(MESSAGE_TYPES.META, {
	                    model: m.exportModel(),
	                    history: m.exportHistory()
	                });
	            }
	        });

	        return m;
	    },


	    /**
	     * Broadcast an operation to clients editing the same model.
	     * @param  {Object} payload Data to send.
	     * @param  {String} id      Model identifier.
	     */
	    broadcastOp: function broadcastOp(payload, id) {
	        var op = payload.op;
	        var r = payload.r;

	        var msg = createMessage(MESSAGE_TYPES.OP, { id: id, op: op, r: r });
	        this._RTC.send(msg, id);
	    },


	    /**
	     * Apply a remote operation to a specific model.
	     * @param  {Object} p Message payload from peer.
	     */
	    handleOp: function handleOp(payload) {
	        var id = payload.id;
	        var op = payload.op;
	        var r = payload.r;
	        // Apply remote operation to model.

	        this._models[id].remoteOp(r, op);
	    },


	    /**
	     * Import snapshot and history from peer.
	     * @param  {Object} payload Text model and history data from peer.
	     * @param  {String} id      Model identifier.
	     */
	    handleMeta: function handleMeta(payload, id) {
	        var model = payload.model;
	        var history = payload.history;

	        this._models[id].import(model, history);
	    },


	    /**
	     * Redirect a message from peer to the appropriate procedure.
	     * @param  {Object} msg Message from peer.
	     */
	    handleMessage: function handleMessage(msg) {
	        var scope = msg.scope;
	        var data = msg.data;


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
	}, _eventemitter2.default.prototype);

	/**
	 * p2pedit constructor
	 * @param  {Object} config Configuration object.
	 * @return {Object}        p2pedit instance.
	 */
	var p2pedit = function p2pedit() {
	    var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	    var id = config.id || (0, _utils.uuid)();
	    var rtc = (0, _p2p2.default)({ id: id });
	    var props = {
	        _models: {},
	        _RTC: rtc
	    };

	    var obj = (0, _utils.create)(proto, props);

	    _eventemitter2.default.call(obj);

	    // Bubble up `ready` event from rtcClient.
	    rtc.on('ready', function () {
	        return obj.emit('ready');
	    });
	    // Handle messages from peers.
	    rtc.on('data', function () {
	        return obj.handleMessage.apply(obj, arguments);
	    });

	    return obj;
	};

	exports.default = p2pedit;

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var has = Object.prototype.hasOwnProperty;

	//
	// We store our EE objects in a plain object whose properties are event names.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// `~` to make sure that the built-in object properties are not overridden or
	// used as an attack vector.
	// We also assume that `Object.create(null)` is available when the event name
	// is an ES6 Symbol.
	//
	var prefix = typeof Object.create !== 'function' ? '~' : false;

	/**
	 * Representation of a single EventEmitter function.
	 *
	 * @param {Function} fn Event handler to be called.
	 * @param {Mixed} context Context for function execution.
	 * @param {Boolean} [once=false] Only emit once
	 * @api private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Minimal EventEmitter interface that is molded against the Node.js
	 * EventEmitter interface.
	 *
	 * @constructor
	 * @api public
	 */
	function EventEmitter() { /* Nothing to set */ }

	/**
	 * Hold the assigned EventEmitters by name.
	 *
	 * @type {Object}
	 * @private
	 */
	EventEmitter.prototype._events = undefined;

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @api public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var events = this._events
	    , names = []
	    , name;

	  if (!events) return names;

	  for (name in events) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return a list of assigned event listeners.
	 *
	 * @param {String} event The events that should be listed.
	 * @param {Boolean} exists We only need to know if there are listeners.
	 * @returns {Array|Boolean}
	 * @api public
	 */
	EventEmitter.prototype.listeners = function listeners(event, exists) {
	  var evt = prefix ? prefix + event : event
	    , available = this._events && this._events[evt];

	  if (exists) return !!available;
	  if (!available) return [];
	  if (available.fn) return [available.fn];

	  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
	    ee[i] = available[i].fn;
	  }

	  return ee;
	};

	/**
	 * Emit an event to all registered event listeners.
	 *
	 * @param {String} event The name of the event.
	 * @returns {Boolean} Indication if we've emitted an event.
	 * @api public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events || !this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if ('function' === typeof listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Register a new EventListener for the given event.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} [context=this] The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  var listener = new EE(fn, context || this)
	    , evt = prefix ? prefix + event : event;

	  if (!this._events) this._events = prefix ? {} : Object.create(null);
	  if (!this._events[evt]) this._events[evt] = listener;
	  else {
	    if (!this._events[evt].fn) this._events[evt].push(listener);
	    else this._events[evt] = [
	      this._events[evt], listener
	    ];
	  }

	  return this;
	};

	/**
	 * Add an EventListener that's only called once.
	 *
	 * @param {String} event Name of the event.
	 * @param {Function} fn Callback function.
	 * @param {Mixed} [context=this] The context of the function.
	 * @api public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  var listener = new EE(fn, context || this, true)
	    , evt = prefix ? prefix + event : event;

	  if (!this._events) this._events = prefix ? {} : Object.create(null);
	  if (!this._events[evt]) this._events[evt] = listener;
	  else {
	    if (!this._events[evt].fn) this._events[evt].push(listener);
	    else this._events[evt] = [
	      this._events[evt], listener
	    ];
	  }

	  return this;
	};

	/**
	 * Remove event listeners.
	 *
	 * @param {String} event The event we want to remove.
	 * @param {Function} fn The listener that we need to find.
	 * @param {Mixed} context Only remove listeners matching this context.
	 * @param {Boolean} once Only remove once listeners.
	 * @api public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events || !this._events[evt]) return this;

	  var listeners = this._events[evt]
	    , events = [];

	  if (fn) {
	    if (listeners.fn) {
	      if (
	           listeners.fn !== fn
	        || (once && !listeners.once)
	        || (context && listeners.context !== context)
	      ) {
	        events.push(listeners);
	      }
	    } else {
	      for (var i = 0, length = listeners.length; i < length; i++) {
	        if (
	             listeners[i].fn !== fn
	          || (once && !listeners[i].once)
	          || (context && listeners[i].context !== context)
	        ) {
	          events.push(listeners[i]);
	        }
	      }
	    }
	  }

	  //
	  // Reset the array, or remove it completely if we have no more listeners.
	  //
	  if (events.length) {
	    this._events[evt] = events.length === 1 ? events[0] : events;
	  } else {
	    delete this._events[evt];
	  }

	  return this;
	};

	/**
	 * Remove all listeners or only the listeners for the specified event.
	 *
	 * @param {String} event The event want to remove all listeners for.
	 * @api public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  if (!this._events) return this;

	  if (event) delete this._events[prefix ? prefix + event : event];
	  else this._events = prefix ? {} : Object.create(null);

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// This function doesn't apply anymore.
	//
	EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
	  return this;
	};

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Expose the module.
	//
	if (true) {
	  module.exports = EventEmitter;
	}


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _eventemitter = __webpack_require__(1);

	var _eventemitter2 = _interopRequireDefault(_eventemitter);

	var _otTextTp = __webpack_require__(3);

	var _utils = __webpack_require__(6);

	var _wayback = __webpack_require__(7);

	var _wayback2 = _interopRequireDefault(_wayback);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var proto = (0, _utils.create)(_eventemitter2.default.prototype, {
	    adapter: function adapter(a) {
	        var _this = this;

	        var sync = function sync() {
	            return _this._adapters.forEach(function (a) {
	                return a !== spec ? a.update() : _utils.noop;
	            });
	        };

	        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	            args[_key - 1] = arguments[_key];
	        }

	        var spec = a.apply(undefined, [this, sync].concat(args));
	        this._adapters.push(spec);
	        spec.install();
	    },
	    sync: function sync() {
	        this._adapters.forEach(function (a) {
	            return a.update();
	        });
	    },
	    import: function _import(model, history) {
	        this.importModel(model);
	        this.importHistory(history);
	        this.sync();
	    },
	    broadcast: function broadcast(op, r) {
	        var id = this.id;
	        var parent = this._history.getRevision(r).parent;
	        this.emit('broadcast', { op: op, r: parent });
	    },
	    remoteOp: function remoteOp(parent, op) {
	        if (parent === this._history.head) {
	            this.submit(op, _utils.noop);
	        } else {
	            var sequence = this._history.getSequence(parent);
	            // snapshot is out of date
	            if (sequence === null) {
	                this.emit('resync');
	                return;
	            } else {
	                // operation is out of date
	                var composedSequence = sequence.reduce(_otTextTp.type.compose);
	                this.submit(_otTextTp.type.transform(op, composedSequence, 'left'), _utils.noop);
	            }
	        }
	        this.emit('remoteOp', { op: op });
	    },
	    insert: function insert(index, text) {
	        var _this2 = this;

	        this._model.insert(index, text, function (op, r) {
	            return _this2.broadcast(op, r);
	        });
	    },
	    delete: function _delete(index, numChars) {
	        var _this3 = this;

	        this._model.remove(index, numChars, function (op, r) {
	            return _this3.broadcast(op, r);
	        });
	    },
	    get: function get() {
	        return this._model.get();
	    },
	    submit: function submit(op, cb) {
	        op = _otTextTp.type.normalize(op);
	        this._snapshot = _otTextTp.type.apply(this._snapshot, op);
	        cb(op, this._history.push(op));
	    },
	    importModel: function importModel(model) {
	        this._snapshot = _otTextTp.type.deserialize(model);
	    },
	    exportModel: function exportModel() {
	        return _otTextTp.type.serialize(this._snapshot);
	    },
	    importHistory: function importHistory(h) {
	        this._history.importModel(h);
	    },
	    exportHistory: function exportHistory() {
	        return this._history.exportModel();
	    }
	});

	var model = function model(id) {
	    var text = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

	    var _snapshot = _otTextTp.type.create(text);

	    var _history = (0, _wayback2.default)();

	    var props = { id: id, _snapshot: _snapshot, _history: _history, _adapters: [] };

	    var obj = (0, _utils.create)(proto, props);

	    _eventemitter2.default.call(obj);

	    obj._model = _otTextTp.type.api(function () {
	        return obj._snapshot;
	    }, obj.submit.bind(obj));

	    return obj;
	};

	exports.default = model;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	var type = __webpack_require__(4);
	type.api = __webpack_require__(5);

	exports.type = type;


/***/ },
/* 4 */
/***/ function(module, exports) {

	// A TP2 implementation of text, following this spec:
	// http://code.google.com/p/lightwave/source/browse/trunk/experimental/ot/README
	//
	// A document is made up of a string and a set of tombstones inserted throughout
	// the string. For example, 'some ', (2 tombstones), 'string'.
	//
	// This is encoded in a document as ['some ', (2 tombstones), 'string']
	// (It should be encoded as {s:'some string', t:[5, -2, 6]} because thats
	// faster in JS, but its not.)
	//
	// Ops are lists of components which iterate over the whole document. (I might
	// change this at some point, but a version thats less strict is backwards
	// compatible.)
	//
	// Components are either:
	//   N:         Skip N characters in the original document
	//   {i:'str'}: Insert 'str' at the current position in the document
	//   {i:N}:     Insert N tombstones at the current position in the document
	//   {d:N}:     Delete (tombstone) N characters at the current position in the document
	//
	// Eg: [3, {i:'hi'}, 5, {d:8}]
	//
	// Snapshots are lists with characters and tombstones. Characters are stored in strings
	// and adjacent tombstones are flattened into numbers.
	//
	// Eg, the document: 'Hello .....world' ('.' denotes tombstoned (deleted) characters)
	// would be represented by a document snapshot of ['Hello ', 5, 'world']

	var type = module.exports = {
	  name: 'text-tp2',
	  tp2: true,
	  uri: 'http://sharejs.org/types/text-tp2v1',
	  create: function(initial) {
	    if (initial == null) {
	      initial = '';
	    } else {
	      if (typeof initial != 'string') throw new Error('Initial data must be a string');
	    }

	    return {
	      charLength: initial.length,
	      totalLength: initial.length,
	      data: initial.length ? [initial] : []
	    };
	  },

	  serialize: function(doc) {
	    if (!doc.data) {
	      throw new Error('invalid doc snapshot');
	    }
	    return doc.data;
	  },

	  deserialize: function(data) {
	    var doc = type.create();
	    doc.data = data;

	    for (var i = 0; i < data.length; i++) {
	      var component = data[i];

	      if (typeof component === 'string') {
	        doc.charLength += component.length;
	        doc.totalLength += component.length;
	      } else {
	        doc.totalLength += component;
	      }
	    }

	    return doc;
	  }
	};

	var isArray = Array.isArray || function(obj) {
	  return Object.prototype.toString.call(obj) == '[object Array]';
	};

	var checkOp = function(op) {
	  if (!isArray(op)) throw new Error('Op must be an array of components');

	  var last = null;
	  for (var i = 0; i < op.length; i++) {
	    var c = op[i];
	    if (typeof c == 'object') {
	      // The component is an insert or a delete.
	      if (c.i !== undefined) { // Insert.
	        if (!((typeof c.i === 'string' && c.i.length > 0) // String inserts
	              || (typeof c.i === 'number' && c.i > 0))) // Tombstone inserts
	          throw new Error('Inserts must insert a string or a +ive number');

	      } else if (c.d !== undefined) { // Delete
	        if (!(typeof c.d === 'number' && c.d > 0))
	          throw new Error('Deletes must be a +ive number');

	      } else throw new Error('Operation component must define .i or .d');

	    } else {
	      // The component must be a skip.
	      if (typeof c != 'number') throw new Error('Op components must be objects or numbers');

	      if (c <= 0) throw new Error('Skip components must be a positive number');
	      if (typeof last === 'number') throw new Error('Adjacent skip components should be combined');
	    }

	    last = c;
	  }
	};

	// Take the next part from the specified position in a document snapshot.
	// position = {index, offset}. It will be updated.
	var takeDoc = type._takeDoc = function(doc, position, maxlength, tombsIndivisible) {
	  if (position.index >= doc.data.length)
	    throw new Error('Operation goes past the end of the document');

	  var part = doc.data[position.index];

	  // This can be written as an ugly-arsed giant ternary statement, but its much
	  // more readable like this. Uglify will convert it into said ternary anyway.
	  var result;
	  if (typeof part == 'string') {
	    if (maxlength != null) {
	      result = part.slice(position.offset, position.offset + maxlength);
	    } else {
	      result = part.slice(position.offset);
	    }
	  } else {
	    if (maxlength == null || tombsIndivisible) {
	      result = part - position.offset;
	    } else {
	      result = Math.min(maxlength, part - position.offset);
	    }
	  }

	  var resultLen = result.length || result;

	  if ((part.length || part) - position.offset > resultLen) {
	    position.offset += resultLen;
	  } else {
	    position.index++;
	    position.offset = 0;
	  }

	  return result;
	};

	// Append a part to the end of a document
	var appendDoc = type._appendDoc = function(doc, p) {
	  if (p === 0 || p === '') return;

	  if (typeof p === 'string') {
	    doc.charLength += p.length;
	    doc.totalLength += p.length;
	  } else {
	    doc.totalLength += p;
	  }

	  var data = doc.data;
	  if (data.length === 0) {
	    data.push(p);
	  } else if (typeof data[data.length - 1] === typeof p) {
	    data[data.length - 1] += p;
	  } else {
	    data.push(p);
	  }
	};

	// Apply the op to the document. The document is not modified in the process.
	type.apply = function(doc, op) {
	  if (doc.totalLength == null || doc.charLength == null || !isArray(doc.data)) {
	    throw new Error('Snapshot is invalid');
	  }
	  checkOp(op);

	  var newDoc = type.create();
	  var position = {index: 0, offset: 0};

	  for (var i = 0; i < op.length; i++) {
	    var component = op[i];
	    var remainder, part;

	    if (typeof component == 'number') { // Skip
	      remainder = component;
	      while (remainder > 0) {
	        part = takeDoc(doc, position, remainder);
	        appendDoc(newDoc, part);
	        remainder -= part.length || part;
	      }

	    } else if (component.i !== undefined) { // Insert
	      appendDoc(newDoc, component.i);

	    } else if (component.d !== undefined) { // Delete
	      remainder = component.d;
	      while (remainder > 0) {
	        part = takeDoc(doc, position, remainder);
	        remainder -= part.length || part;
	      }
	      appendDoc(newDoc, component.d);
	    }
	  }
	  return newDoc;
	};

	// Append an op component to the end of the specified op.  Exported for the
	// randomOpGenerator.
	var append = type._append = function(op, component) {
	  var last;

	  if (component === 0 || component.i === '' || component.i === 0 || component.d === 0) {
	    // Drop the new component.
	  } else if (op.length === 0) {
	    op.push(component);
	  } else {
	    last = op[op.length - 1];
	    if (typeof component == 'number' && typeof last == 'number') {
	      op[op.length - 1] += component;
	    } else if (component.i != null && (last.i != null) && typeof last.i === typeof component.i) {
	      last.i += component.i;
	    } else if (component.d != null && (last.d != null)) {
	      last.d += component.d;
	    } else {
	      op.push(component);
	    }
	  }
	};

	var take = function(op, cursor, maxlength, insertsIndivisible) {
	  if (cursor.index === op.length) return null;
	  var e = op[cursor.index];
	  var current;
	  var result;

	  var offset = cursor.offset;

	  // if the current element is a skip, an insert of a number or a delete
	  if (typeof (current = e) == 'number' || typeof (current = e.i) == 'number' || (current = e.d) != null) {
	    var c;
	    if ((maxlength == null) || current - offset <= maxlength || (insertsIndivisible && e.i != null)) {
	      // Return the rest of the current element.
	      c = current - offset;
	      ++cursor.index;
	      cursor.offset = 0;
	    } else {
	      cursor.offset += maxlength;
	      c = maxlength;
	    }

	    // Package the component back up.
	    if (e.i != null) {
	      return {i: c};
	    } else if (e.d != null) {
	      return {d: c};
	    } else {
	      return c;
	    }
	  } else { // Insert of a string.
	    if ((maxlength == null) || e.i.length - offset <= maxlength || insertsIndivisible) {
	      result = {i: e.i.slice(offset)};
	      ++cursor.index;
	      cursor.offset = 0;
	    } else {
	      result = {i: e.i.slice(offset, offset + maxlength)};
	      cursor.offset += maxlength;
	    }
	    return result;
	  }
	};

	// Find and return the length of an op component
	var componentLength = function(component) {
	  if (typeof component === 'number') {
	    return component;
	  } else if (typeof component.i === 'string') {
	    return component.i.length;
	  } else {
	    return component.d || component.i;
	  }
	};

	// Normalize an op, removing all empty skips and empty inserts / deletes.
	// Concatenate adjacent inserts and deletes.
	type.normalize = function(op) {
	  var newOp = [];
	  for (var i = 0; i < op.length; i++) {
	    append(newOp, op[i]);
	  }
	  return newOp;
	};

	// This is a helper method to transform and prune. goForwards is true for transform, false for prune.
	var transformer = function(op, otherOp, goForwards, side) {
	  checkOp(op);
	  checkOp(otherOp);

	  var newOp = [];

	  // Cursor moving over op. Used by take
	  var cursor = {index:0, offset:0};

	  for (var i = 0; i < otherOp.length; i++) {
	    var component = otherOp[i];
	    var len = componentLength(component);
	    var chunk;

	    if (component.i != null) { // Insert text or tombs
	      if (goForwards) { // Transform - insert skips over deleted parts.
	        if (side === 'left') {
	          // The left side insert should go first.
	          var next;
	          while ((next = op[cursor.index]) && next.i != null) {
	            append(newOp, take(op, cursor));
	          }
	        }
	        // In any case, skip the inserted text.
	        append(newOp, len);

	      } else { // Prune. Remove skips for inserts.
	        while (len > 0) {
	          chunk = take(op, cursor, len, true);

	          // The chunk will be null if we run out of components in the other op.
	          if (chunk === null) throw new Error('The transformed op is invalid');
	          if (chunk.d != null)
	            throw new Error('The transformed op deletes locally inserted characters - it cannot be purged of the insert.');

	          if (typeof chunk == 'number')
	            len -= chunk;
	          else
	            append(newOp, chunk);
	        }
	      }
	    } else { // Skips or deletes.
	      while (len > 0) {
	        chunk = take(op, cursor, len, true);
	        if (chunk === null) throw new Error('The op traverses more elements than the document has');

	        append(newOp, chunk);
	        if (!chunk.i) len -= componentLength(chunk);
	      }
	    }
	  }

	  // Append extras from op1.
	  var component;
	  while ((component = take(op, cursor))) {
	    if (component.i === undefined) {
	      throw new Error("Remaining fragments in the op: " + component);
	    }
	    append(newOp, component);
	  }
	  return newOp;
	};

	// transform op1 by op2. Return transformed version of op1. op1 and op2 are
	// unchanged by transform. Side should be 'left' or 'right', depending on if
	// op1.id <> op2.id.
	//
	// 'left' == client op for ShareJS.
	type.transform = function(op, otherOp, side) {
	  if (side != 'left' && side != 'right')
	    throw new Error("side (" + side + ") should be 'left' or 'right'");

	  return transformer(op, otherOp, true, side);
	};

	type.prune = function(op, otherOp) {
	  return transformer(op, otherOp, false);
	};

	type.compose = function(op1, op2) {
	  //var chunk, chunkLength, component, length, result, take, _, _i, _len, _ref;
	  if (op1 == null) return op2;

	  checkOp(op1);
	  checkOp(op2);

	  var result = [];

	  // Cursor over op1.
	  var cursor = {index:0, offset:0};

	  var component;

	  for (var i = 0; i < op2.length; i++) {
	    component = op2[i];
	    var len, chunk;

	    if (typeof component === 'number') { // Skip
	      // Just copy from op1.
	      len = component;
	      while (len > 0) {
	        chunk = take(op1, cursor, len);
	        if (chunk === null)
	          throw new Error('The op traverses more elements than the document has');

	        append(result, chunk);
	        len -= componentLength(chunk);
	      }

	    } else if (component.i !== undefined) { // Insert
	      append(result, {i: component.i});

	    } else { // Delete
	      len = component.d;
	      while (len > 0) {
	        chunk = take(op1, cursor, len);
	        if (chunk === null)
	          throw new Error('The op traverses more elements than the document has');

	        var chunkLength = componentLength(chunk);

	        if (chunk.i !== undefined)
	          append(result, {i: chunkLength});
	        else
	          append(result, {d: chunkLength});

	        len -= chunkLength;
	      }
	    }
	  }

	  // Append extras from op1.
	  while ((component = take(op1, cursor))) {
	    if (component.i === undefined) {
	      throw new Error("Remaining fragments in op1: " + component);
	    }
	    append(result, component);
	  }
	  return result;
	};



/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	// Text document API for text-tp2

	var type = __webpack_require__(4);
	var takeDoc = type._takeDoc;
	var append = type._append;

	var appendSkipChars = function(op, doc, pos, maxlength) {
	  while ((maxlength == null || maxlength > 0) && pos.index < doc.data.length) {
	    var part = takeDoc(doc, pos, maxlength, true);
	    if (maxlength != null && typeof part === 'string') {
	      maxlength -= part.length;
	    }
	    append(op, part.length || part);
	  }
	};

	module.exports = api;
	function api(getSnapshot, submitOp) {
	  return {
	    // Number of characters in the string
	    getLength: function() { return getSnapshot().charLength; },

	    // Flatten the document into a string
	    get: function() {
	      var snapshot = getSnapshot();
	      var strings = [];

	      for (var i = 0; i < snapshot.data.length; i++) {
	        var elem = snapshot.data[i];
	        if (typeof elem == 'string') {
	          strings.push(elem);
	        }
	      }

	      return strings.join('');
	    },

	    getText: function() {
	      console.warn("`getText()` is deprecated; use `get()` instead.");
	      return this.get();
	    },

	    // Insert text at pos
	    insert: function(pos, text, callback) {
	      if (pos == null) pos = 0;

	      var op = [];
	      var docPos = {index: 0, offset: 0};
	      var snapshot = getSnapshot();

	      // Skip to the specified position
	      appendSkipChars(op, snapshot, docPos, pos);

	      // Append the text
	      append(op, {i: text});
	      appendSkipChars(op, snapshot, docPos);
	      submitOp(op, callback);
	      return op;
	    },

	    // Remove length of text at pos
	    remove: function(pos, len, callback) {
	      var op = [];
	      var docPos = {index: 0, offset: 0};
	      var snapshot = getSnapshot();

	      // Skip to the position
	      appendSkipChars(op, snapshot, docPos, pos);

	      while (len > 0) {
	        var part = takeDoc(snapshot, docPos, len, true);

	        // We only need to delete actual characters. This should also be valid if
	        // we deleted all the tombstones in the document here.
	        if (typeof part === 'string') {
	          append(op, {d: part.length});
	          len -= part.length;
	        } else {
	          append(op, part);
	        }
	      }

	      appendSkipChars(op, snapshot, docPos);
	      submitOp(op, callback);
	      return op;
	    },

	    _beforeOp: function() {
	      // Its a shame we need this. This also currently relies on snapshots being
	      // cloned during apply(). This is used in _onOp below to figure out what
	      // text was _actually_ inserted and removed.
	      //
	      // Maybe instead we should do all the _onOp logic here and store the result
	      // then play the events when _onOp is actually called or something.
	      this.__prevSnapshot = getSnapshot();
	    },

	    _onOp: function(op) {
	      var textPos = 0;
	      var docPos = {index:0, offset:0};
	      // The snapshot we get here is the document state _AFTER_ the specified op
	      // has been applied. That means any deleted characters are now tombstones.
	      var prevSnapshot = this.__prevSnapshot;

	      for (var i = 0; i < op.length; i++) {
	        var component = op[i];
	        var part, remainder;

	        if (typeof component == 'number') {
	          // Skip
	          for (remainder = component;
	              remainder > 0;
	              remainder -= part.length || part) {

	            part = takeDoc(prevSnapshot, docPos, remainder);
	            if (typeof part === 'string')
	              textPos += part.length;
	          }
	        } else if (component.i != null) {
	          // Insert
	          if (typeof component.i == 'string') {
	            // ... and its an insert of text, not insert of tombstones
	            if (this.onInsert) this.onInsert(textPos, component.i);
	            textPos += component.i.length;
	          }
	        } else {
	          // Delete
	          for (remainder = component.d;
	              remainder > 0;
	              remainder -= part.length || part) {

	            part = takeDoc(prevSnapshot, docPos, remainder);
	            if (typeof part == 'string' && this.onRemove)
	              this.onRemove(textPos, part.length);
	          }
	        }
	      }
	    }
	  };
	};

	api.provides = {text: true};


/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	var create = function create(proto, props) {
	    if (Array.isArray(proto)) {
	        proto = proto.reduce(c);
	    }
	    if (Array.isArray(props)) {
	        Object.assign.apply(Object, [props[0]].concat(_toConsumableArray(props.slice(1))));
	    }
	    return Object.assign(Object.create(proto), props);
	};

	var noop = function noop() {
	    return false;
	};

	var s4 = function s4() {
	    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	};

	var uuid = function uuid() {
	    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
	};

	var stringify = JSON.stringify;

	exports.create = create;
	exports.noop = noop;
	exports.uuid = uuid;
	exports.stringify = stringify;

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _sha = __webpack_require__(8);

	var _sha2 = _interopRequireDefault(_sha);

	var _utils = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	// Adopted from hharnisc/wayback

	var proto = {
	    importModel: function importModel(model) {
	        // TODO: sanitize input
	        // TODO: handle when maximumRevisions is set
	        this.model = model.model;
	        this.modelLength = model.length;
	        this.tail = model.tail;
	        this.head = model.head;
	    },
	    exportModel: function exportModel() {
	        return {
	            model: this.model,
	            length: this.modelLength,
	            head: this.head,
	            tail: this.tail
	        };
	    },
	    hasRevision: function hasRevision(r) {
	        return r in this.model;
	    },
	    getRevision: function getRevision(r) {
	        return this.hasRevision(r) ? this.model[r] : null;
	    },
	    getSequence: function getSequence(r) {
	        if (!this.hasRevision(r)) {
	            return null;
	        }

	        var sequence = [];
	        var curRevision = this.model[r].child;

	        while (curRevision) {
	            var curModel = this.model[curRevision];
	            sequence.push(curModel.data);
	            curRevision = curModel.child;
	        }

	        return sequence;
	    },
	    push: function push(data) {
	        var r = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

	        // create a new node
	        var id = this.createNode(this.head, data, r);

	        // set the new node as the child of the
	        // parent if it exists
	        if (this.head) {
	            this.model[this.head].child = id;
	        }

	        // update the head and tail references
	        this.head = id;

	        if (!this.tail) {
	            this.tail = id;
	        }

	        // increment the model length
	        this.modelLength += 1;

	        if (this.maxRevisions && this.modelLength > this.maxRevisions) {
	            this.pop();
	        }

	        return id;
	    },
	    pop: function pop() {
	        // if empty return null
	        if (!this.tail) {
	            return null;
	        }

	        // get the current tail item
	        var modelItem = this.model[this.tail];
	        var item = {};

	        item[this.tail] = modelItem;

	        delete this.model[this.tail];

	        // if there are 2 or more revisions update the child
	        if (this.modelLength > 1) {
	            this.tail = modelItem.child;
	            // this.model[modelItem.child].parent = null;
	        } else {
	                // otherwise clear the head and tail revisions
	                this.tail = null;
	                this.head = null;
	            }

	        // decrement the number if items
	        this.modelLength -= 1;

	        return item;
	    },
	    insert: function insert(parent, data) {
	        var r = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

	        // unknown parent
	        if (!this.hasRevision(parent)) {
	            return null;
	        }

	        // just do a push op when inserting to head
	        if (parent === this.head) {
	            return this.push(data, r);
	        }

	        var parentModel = this.model[parent];
	        var childModel = this.model[parentModel.child];

	        // create a new node with links:
	        // parent <- newNode -> child
	        var insertId = this.createNode(parent, data, parentModel.child, r);

	        // parent -> newNode
	        parentModel.child = insertId;

	        // newNode <- child
	        childModel.parent = insertId;

	        // increment the model length
	        this.modelLength += 1;

	        if (this.maxRevisions && this.modelLength > this.maxRevisions) {
	            this.pop();
	        }

	        return insertId;
	    },
	    createNode: function createNode(parent, data) {
	        var child = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
	        var r = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

	        r = r || (0, _sha2.default)((0, _utils.stringify)({ parent: parent, data: data }));

	        // create a new node
	        this.model[r] = { data: data, parent: parent, child: child };

	        return r;
	    }
	};

	var wayback = function wayback() {
	    var maxRevisions = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

	    var props = {
	        model: {},
	        modelLength: 0,
	        head: null,
	        tail: null,
	        maxRevisions: maxRevisions
	    };

	    var obj = (0, _utils.create)(proto, props);

	    return obj;
	};

	exports.default = wayback;

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;(function(){
	    var root = this;

	    //消息填充位，补足长度。
	    function fillString(str){
	        var blockAmount = ((str.length + 8) >> 6) + 1,
	            blocks = [],
	            i;

	        for(i = 0; i < blockAmount * 16; i++){
	            blocks[i] = 0;
	        }
	        for(i = 0; i < str.length; i++){
	            blocks[i >> 2] |= str.charCodeAt(i) << (24 - (i & 3) * 8);
	        }
	        blocks[i >> 2] |= 0x80 << (24 - (i & 3) * 8);
	        blocks[blockAmount * 16 - 1] = str.length * 8;

	        return blocks;
	    }

	    //将输入的二进制数组转化为十六进制的字符串。
	    function binToHex(binArray){
	        var hexString = "0123456789abcdef",
	            str = "",
	            i;

	        for(i = 0; i < binArray.length * 4; i++){
	            str += hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8 + 4)) & 0xF) +
	                    hexString.charAt((binArray[i >> 2] >> ((3 - i % 4) * 8  )) & 0xF);
	        }

	        return str;
	    }

	    //核心函数，输出为长度为5的number数组，对应160位的消息摘要。
	    function coreFunction(blockArray){
	        var w = [],
	            a = 0x67452301,
	            b = 0xEFCDAB89,
	            c = 0x98BADCFE,
	            d = 0x10325476,
	            e = 0xC3D2E1F0,
	            olda,
	            oldb,
	            oldc,
	            oldd,
	            olde,
	            t,
	            i,
	            j;

	        for(i = 0; i < blockArray.length; i += 16){  //每次处理512位 16*32
	            olda = a;
	            oldb = b;
	            oldc = c;
	            oldd = d;
	            olde = e;

	            for(j = 0; j < 80; j++){  //对每个512位进行80步操作
	                if(j < 16){
	                    w[j] = blockArray[i + j];
	                }else{
	                    w[j] = cyclicShift(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
	                }
	                t = modPlus(modPlus(cyclicShift(a, 5), ft(j, b, c, d)), modPlus(modPlus(e, w[j]), kt(j)));
	                e = d;
	                d = c;
	                c = cyclicShift(b, 30);
	                b = a;
	                a = t;
	            }

	            a = modPlus(a, olda);
	            b = modPlus(b, oldb);
	            c = modPlus(c, oldc);
	            d = modPlus(d, oldd);
	            e = modPlus(e, olde);
	        }

	        return [a, b, c, d, e];
	    }

	    //根据t值返回相应得压缩函数中用到的f函数。
	    function ft(t, b, c, d){
	        if(t < 20){
	            return (b & c) | ((~b) & d);
	        }else if(t < 40){
	            return b ^ c ^ d;
	        }else if(t < 60){
	            return (b & c) | (b & d) | (c & d);
	        }else{
	            return b ^ c ^ d;
	        }
	    }

	    //根据t值返回相应得压缩函数中用到的K值。
	    function kt(t){
	        return (t < 20) ?  0x5A827999 :
	                (t < 40) ? 0x6ED9EBA1 :
	                (t < 60) ? 0x8F1BBCDC : 0xCA62C1D6;
	    }

	    //模2的32次方加法，因为JavaScript的number是双精度浮点数表示，所以将32位数拆成高16位和低16位分别进行相加
	    function modPlus(x, y){
	        var low = (x & 0xFFFF) + (y & 0xFFFF),
	            high = (x >> 16) + (y >> 16) + (low >> 16);

	        return (high << 16) | (low & 0xFFFF);
	    }

	    //对输入的32位的num二进制数进行循环左移 ,因为JavaScript的number是双精度浮点数表示，所以移位需需要注意
	    function cyclicShift(num, k){
	        return (num << k) | (num >>> (32 - k));
	    }

	    //主函数根据输入的消息字符串计算消息摘要，返回十六进制表示的消息摘要
	    function sha1(s){
	        return binToHex(coreFunction(fillString(s)));
	    }

	    // support AMD and Node
	    if(true){
	        !(__WEBPACK_AMD_DEFINE_RESULT__ = function(){
	            return sha1;
	        }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    }else if(typeof exports !== 'undefined') {
	        if(typeof module !== 'undefined' && module.exports) {
	          exports = module.exports = sha1;
	        }
	        exports.sha1 = sha1;
	    } else {
	        root.sha1 = sha1;
	    }

	}).call(this);

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _eventemitter = __webpack_require__(1);

	var _eventemitter2 = _interopRequireDefault(_eventemitter);

	var _adapter = __webpack_require__(10);

	var _adapter2 = _interopRequireDefault(_adapter);

	var _peer = __webpack_require__(11);

	var _peer2 = _interopRequireDefault(_peer);

	var _utils = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var DEFAULT_SCOPE = '/';

	(0, _adapter2.default)(window);

	var createCandidate = function createCandidate() {
	    var _ref = arguments.length <= 0 || arguments[0] === undefined ? c : arguments[0];

	    var sdpMLineIndex = _ref.sdpMLineIndex;
	    var candidate = _ref.candidate;
	    return new RTCIceCandidate({ sdpMLineIndex: sdpMLineIndex, candidate: candidate });
	};

	var createSDP = function createSDP(sdp) {
	    return new RTCSessionDescription(sdp);
	};
	var onSDPError = function onSDPError(err) {
	    return console.error(err);
	};

	var proto = (0, _utils.create)(_eventemitter2.default.prototype, {
	    // Send a message to all peers, optionally peers in a specific scope.

	    send: function send(msg) {
	        var scope = arguments.length <= 1 || arguments[1] === undefined ? DEFAULT_SCOPE : arguments[1];

	        if (typeof msg !== 'string') {
	            msg = (0, _utils.stringify)(msg);
	        }

	        for (var prop in this.peers) {
	            this.peers[prop].send(msg, scope);
	        }
	    },


	    // Request access to a scope.
	    createScope: function createScope() {
	        var scope = arguments.length <= 0 || arguments[0] === undefined ? DEFAULT_SCOPE : arguments[0];
	        var config = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	        var id = this.id;
	        var socket = this.socket;


	        socket.send((0, _utils.stringify)({
	            t: 'OPEN',
	            p: { id: id, scopes: [scope || DEFAULT_SCOPE] }
	        }));

	        if (config.getMeta) {
	            this.metas[scope] = config.getMeta;
	        }
	    },


	    // Triggers when a peer has requested to join one of our scopes
	    handleOpen: function handleOpen(msg) {
	        var src = msg.src;
	        var scope = msg.p.scope;

	        this.acceptRequest(src, scope);
	    },
	    handleClose: function handleClose(msg) {
	        var src = msg.src;

	        this.removePeer(src);
	    },


	    // Begin establishing a connection with peer by creating an offer. SDP and
	    // ICE info will be sent over signalling server once available.
	    acceptRequest: function acceptRequest(src, scope) {
	        var socket = this.socket;
	        var id = this.id;

	        var p = this.addConnection({ pid: src, scope: scope });
	        p.offer();
	    },
	    addConnection: function addConnection(config) {
	        var _this = this;

	        var pid = config.pid;
	        var cid = config.cid;
	        var socket = this.socket;


	        var scope = config.scope || DEFAULT_SCOPE;

	        var p;

	        if (this.peers[pid]) {
	            p = this.peers[pid];
	        } else {
	            p = this.peers[pid] = (0, _peer2.default)({ id: pid, socket: socket });
	            p.on('close', function (e) {
	                return _this.removePeer(pid);
	            });
	        }

	        if (p._connections[cid]) {
	            return;
	        }

	        var c = p.addConnection({ id: cid || (0, _utils.uuid)(), scope: scope, getMeta: this.metas[scope] });

	        c.on('data', function (data) {
	            return _this.emit('data', { scope: scope, data: JSON.parse(data) });
	        });

	        return c;
	    },
	    removePeer: function removePeer(pid) {
	        var p = this.peers[pid];

	        // Peer may have closed from DataConnection close already.
	        if (p) {
	            p.destroy();
	            delete this.peers[pid];
	        }
	    },


	    // Recieved SDP info from remote peer.
	    handleSDP: function handleSDP(msg) {
	        var src = msg.src;
	        var _msg$p = msg.p;
	        var cid = _msg$p.cid;
	        var sdp = _msg$p.sdp;
	        var scope = _msg$p.scope;


	        if (sdp.type === 'offer') {
	            var _c = this.addConnection({ pid: src, cid: cid, scope: scope });
	            _c.answer(sdp);
	        } else if (sdp.type === 'answer') {
	            this.peers[src].getConnection(cid).pc.setRemoteDescription(createSDP(sdp));
	        }
	    },


	    // Recieved ICE info from remote peer.
	    handleICE: function handleICE(msg) {
	        var src = msg.src;
	        var _msg$p2 = msg.p;
	        var cid = _msg$p2.cid;
	        var candidate = _msg$p2.candidate;


	        var c = this.peers[src].getConnection(cid);

	        if (c) {
	            var candidates = this.candidates[cid];
	            if (candidates) {
	                for (var prop in candidates) {
	                    for (var i = 0; i < candidates[prop].length; i++) {
	                        c.pc.addIceCandidate(createCandidate(candidates[prop][i]));
	                    }
	                }
	                delete candidates[prop];
	            }
	            c.pc.addIceCandidate(createCandidate(candidate));
	        } else {
	            if (!this.candidates[cid]) {
	                this.candidates[cid] = [];
	            }
	            this.candidates[cid].push(candidate);
	        }
	    },
	    handleScopeAvailable: function handleScopeAvailable(msg) {
	        var name = msg.p.name;

	        this.emit('available', name);
	    },
	    onMessage: function onMessage(msg) {
	        var id = msg.id;
	        var t = msg.t;


	        if (id === this.id) {
	            return;
	        }

	        switch (t) {
	            case 'OPEN':
	                // Peer is requesting to connect
	                this.handleOpen(msg);
	                break;
	            case 'CLOSE':
	                this.handleClose(msg);
	                break;
	            case 'SDP':
	                // SDP info from remote peer
	                this.handleSDP(msg);
	                break;
	            case 'ICE':
	                // ICE candidate from remote peer
	                this.handleICE(msg);
	                break;
	            case 'SA':
	                // Scope available
	                this.handleScopeAvailable(msg);
	                break;
	            default:
	                break;
	        }
	    },
	    destroy: function destroy() {
	        this.socket.send((0, _utils.stringify)({ t: 'CLOSE' }));
	        for (var prop in this.peers) {
	            var pid = this.peers[prop].id;
	            this.removePeer(pid);
	        }
	        this.socket.close();
	    }
	});

	var rtcClient = function rtcClient(config) {
	    var id = config.id;

	    var peers = {};
	    var metas = {}; // ew
	    var candidates = [];
	    var socket = new WebSocket('ws://' + document.domain + ':12034');

	    var props = { id: id, socket: socket, peers: peers, metas: metas, candidates: candidates };

	    var obj = (0, _utils.create)(proto, props);

	    _eventemitter2.default.call(obj);

	    socket.onopen = function () {
	        return obj.emit('ready');
	    };
	    socket.onmessage = function (e) {
	        return obj.onMessage(JSON.parse(e.data));
	    };

	    window.onunload = function () {
	        return obj.destroy();
	    };

	    return obj;
	};

	exports.default = rtcClient;

/***/ },
/* 10 */
/***/ function(module, exports) {

	/*
	 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
	 *
	 *  Use of this source code is governed by a BSD-style license
	 *  that can be found in the LICENSE file in the root of the source
	 *  tree.
	 */

	/*
	 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
	 *
	 *  Use of this source code is governed by a BSD-style license
	 *  that can be found in the LICENSE file in the root of the source
	 *  tree.
	 */

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	function adapter(window) {
	    window.RTCPeerConnection = null;
	    window.getUserMedia = null;
	    window.attachMediaStream = null;
	    window.reattachMediaStream = null;
	    window.webrtcDetectedBrowser = null;
	    window.webrtcDetectedVersion = null;

	    function maybeFixConfiguration(pcConfig) {
	        if (!pcConfig) {
	            return;
	        }
	        for (var i = 0; i < pcConfig.iceServers.length; i++) {
	            if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
	                pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
	                delete pcConfig.iceServers[i].urls;
	            }
	        }
	    }

	    if (navigator.mozGetUserMedia) {
	        // console.log('This appears to be Firefox');

	        window.webrtcDetectedBrowser = 'firefox';

	        window.webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

	        // The RTCPeerConnection object.
	        window.RTCPeerConnection = function (pcConfig, pcConstraints) {
	            // .urls is not supported in FF yet.
	            maybeFixConfiguration(pcConfig);
	            return new mozRTCPeerConnection(pcConfig, pcConstraints);
	        };

	        // The RTCSessionDescription object.
	        RTCSessionDescription = mozRTCSessionDescription;

	        // The RTCIceCandidate object.
	        RTCIceCandidate = mozRTCIceCandidate;

	        // Get UserMedia (only difference is the prefix).
	        // Code from Adam Barth.
	        window.getUserMedia = navigator.mozGetUserMedia.bind(navigator);
	        navigator.getUserMedia = window.getUserMedia;

	        // Creates iceServer from the url for FF.
	        window.createIceServer = function (url, username, password) {
	            var iceServer = null;
	            var urlParts = url.split(':');
	            if (urlParts[0].indexOf('stun') === 0) {
	                // Create iceServer with stun url.
	                iceServer = {
	                    'url': url
	                };
	            } else if (urlParts[0].indexOf('turn') === 0) {
	                if (webrtcDetectedVersion < 27) {
	                    // Create iceServer with turn url.
	                    // Ignore the transport parameter from TURN url for FF version <=27.
	                    var turnUrlParts = url.split('?');
	                    // Return null for createIceServer if transport=tcp.
	                    if (turnUrlParts.length === 1 || turnUrlParts[1].indexOf('transport=udp') === 0) {
	                        iceServer = {
	                            'url': turnUrlParts[0],
	                            'credential': password,
	                            'username': username
	                        };
	                    }
	                } else {
	                    // FF 27 and above supports transport parameters in TURN url,
	                    // So passing in the full url to create iceServer.
	                    iceServer = {
	                        'url': url,
	                        'credential': password,
	                        'username': username
	                    };
	                }
	            }
	            return iceServer;
	        };

	        window.createIceServers = function (urls, username, password) {
	            var iceServers = [];
	            // Use .url for FireFox.
	            for (var i = 0; i < urls.length; i++) {
	                var iceServer = createIceServer(urls[i], username, password);
	                if (iceServer !== null) {
	                    iceServers.push(iceServer);
	                }
	            }
	            return iceServers;
	        };

	        // Attach a media stream to an element.
	        window.attachMediaStream = function (element, stream) {
	            console.log('Attaching media stream');
	            element.mozSrcObject = stream;
	            element.play();
	        };

	        window.reattachMediaStream = function (to, from) {
	            console.log('Reattaching media stream');
	            to.mozSrcObject = from.mozSrcObject;
	            to.play();
	        };
	    } else if (navigator.webkitGetUserMedia) {
	        // console.log('This appears to be Chrome');

	        window.webrtcDetectedBrowser = 'chrome';
	        // Temporary fix until crbug/374263 is fixed.
	        // Setting Chrome version to 999, if version is unavailable.
	        var result = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
	        if (result !== null) {
	            window.webrtcDetectedVersion = parseInt(result[2], 10);
	        } else {
	            window.webrtcDetectedVersion = 999;
	        }

	        // Creates iceServer from the url for Chrome M33 and earlier.
	        window.createIceServer = function (url, username, password) {
	            var iceServer = null;
	            var urlParts = url.split(':');
	            if (urlParts[0].indexOf('stun') === 0) {
	                // Create iceServer with stun url.
	                iceServer = {
	                    'url': url
	                };
	            } else if (urlParts[0].indexOf('turn') === 0) {
	                // Chrome M28 & above uses below TURN format.
	                iceServer = {
	                    'url': url,
	                    'credential': password,
	                    'username': username
	                };
	            }
	            return iceServer;
	        };

	        // Creates iceServers from the urls for Chrome M34 and above.
	        window.createIceServers = function (urls, username, password) {
	            var iceServers = [];
	            if (webrtcDetectedVersion >= 34) {
	                // .urls is supported since Chrome M34.
	                iceServers = {
	                    'urls': urls,
	                    'credential': password,
	                    'username': username
	                };
	            } else {
	                for (var i = 0; i < urls.length; i++) {
	                    var iceServer = createIceServer(urls[i], username, password);
	                    if (iceServer !== null) {
	                        iceServers.push(iceServer);
	                    }
	                }
	            }
	            return iceServers;
	        };

	        // The RTCPeerConnection object.
	        window.RTCPeerConnection = function (pcConfig, pcConstraints) {
	            // .urls is supported since Chrome M34.
	            if (webrtcDetectedVersion < 34) {
	                maybeFixConfiguration(pcConfig);
	            }
	            return new webkitRTCPeerConnection(pcConfig, pcConstraints);
	        };

	        // Get UserMedia (only difference is the prefix).
	        // Code from Adam Barth.
	        window.getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
	        navigator.getUserMedia = window.getUserMedia;

	        // Attach a media stream to an element.
	        window.attachMediaStream = function (element, stream) {
	            if (typeof element.srcObject !== 'undefined') {
	                element.srcObject = stream;
	            } else if (typeof element.mozSrcObject !== 'undefined') {
	                element.mozSrcObject = stream;
	            } else if (typeof element.src !== 'undefined') {
	                element.src = URL.createObjectURL(stream);
	            } else {
	                console.log('Error attaching stream to element.');
	            }
	        };

	        window.reattachMediaStream = function (to, from) {
	            to.src = from.src;
	        };
	    } else {
	        console.log('Browser does not appear to be WebRTC-capable');
	    }
	}

	exports.default = adapter;

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _eventemitter = __webpack_require__(1);

	var _eventemitter2 = _interopRequireDefault(_eventemitter);

	var _connection = __webpack_require__(12);

	var _connection2 = _interopRequireDefault(_connection);

	var _utils = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var DEFAULT_SCOPE = '/';

	var proto = (0, _utils.create)({
	    send: function send(msg) {
	        var scope = arguments.length <= 1 || arguments[1] === undefined ? DEFAULT_SCOPE : arguments[1];

	        if (!this._scopes[scope]) {
	            return;
	        }

	        for (var cid in this._scopes[scope]) {
	            this._scopes[scope][cid].send(msg);
	        }
	    },
	    addConnection: function addConnection(config) {
	        var _this = this;

	        var id = config.id;
	        var getMeta = config.getMeta;
	        var scope = config.scope;

	        var c = (0, _connection2.default)({ id: id, getMeta: getMeta, pid: this.id, socket: this._socket });

	        this._connections[id] = c;

	        c.on('sdp', function (sdp) {
	            return _this.handleSDP(c, sdp);
	        });
	        c.on('candidate', function (sdp) {
	            return _this.handleCandidate(c, sdp);
	        });
	        c.on('close', function () {
	            return _this.removeConnection(id);
	        });

	        if (scope) {
	            this.addToScope(scope, c);
	        }

	        return c;
	    },
	    handleSDP: function handleSDP(c, sdp) {
	        var scope = this.getConnectionScope(c);
	        this._socket.send((0, _utils.stringify)({
	            t: 'SDP',
	            p: { cid: c.id, sdp: sdp, scope: scope },
	            dst: this.id
	        }));
	    },
	    handleCandidate: function handleCandidate(c, candidate) {
	        this._socket.send((0, _utils.stringify)({
	            t: 'ICE',
	            p: { cid: c.id, candidate: candidate },
	            dst: this.id
	        }));
	    },
	    getConnectionScope: function getConnectionScope(c) {
	        for (var name in this._scopes) {
	            for (var cid in this._scopes[name]) {
	                if (this._scopes[name][cid] === c) {
	                    return name;
	                }
	            }
	        }
	    },
	    getConnection: function getConnection(cid) {
	        if (this._connections[cid]) {
	            return this._connections[cid];
	        }
	        return null;
	    },
	    addToScope: function addToScope(scope, c) {
	        if (!this._scopes[scope]) {
	            this._scopes[scope] = {};
	        }

	        this._scopes[scope][c.id] = c;
	    },
	    removeConnection: function removeConnection(cid) {
	        this._connections[cid].destroy();

	        for (var name in this._scopes) {
	            if (cid in this._scopes[name]) {
	                delete this._scopes[name][cid];
	            }
	        }

	        if (Object.keys(this._connections).length === 0) {
	            this.emit('close');
	        }

	        delete this._connections[cid];
	    },
	    destroy: function destroy() {
	        this.removeAllListeners();

	        for (var prop in this._connections) {
	            this._connections[prop].destroy();
	        }
	    }
	}, _eventemitter2.default.prototype);

	var peer = function peer(config) {
	    var id = config.id;
	    var socket = config.socket;

	    var props = {
	        id: id,
	        _socket: socket,
	        _connections: {},
	        _scopes: {}
	    };

	    var obj = (0, _utils.create)(proto, props);

	    _eventemitter2.default.call(obj);

	    return obj;
	};

	exports.default = peer;

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _eventemitter = __webpack_require__(1);

	var _eventemitter2 = _interopRequireDefault(_eventemitter);

	var _utils = __webpack_require__(6);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var isFirefox = !!navigator.mozGetUserMedia;
	var isChrome = !!navigator.webkitGetUserMedia;

	var STUN = {
	    url: isChrome ? 'stun:stun.l.google.com:19302' : 'stun:23.21.150.121'
	};

	var TURN = {
	    url: 'turn:homeo@turn.bistri.com:80',
	    credential: 'homeo'
	};

	var ICE = {
	    iceServers: [STUN]
	};

	var OPTIONAL = {
	    optional: [{ RtcDataChannels: true }, { DtlsSrtpKeyAgreement: true }]
	};

	var OFFER_ANSWER_CONSTRAINTS = {
	    mandatory: {
	        OfferToReceiveAudio: false,
	        OfferToReceiveVideo: false
	    }
	};

	if (isChrome) {
	    var test = /Chrom(e|ium)\/([0-9]+)\./;

	    if (parseInt(navigator.userAgent.match(test)[2]) >= 28) {
	        TURN.username = 'homeo';
	    }

	    ICE.iceServers = [STUN, TURN];
	}

	var createSDP = function createSDP(sdp) {
	    return new RTCSessionDescription(sdp);
	};
	var handleSDPError = function handleSDPError(err) {
	    return console.error(err);
	};

	var proto = (0, _utils.create)({
	    offer: function offer() {
	        var _this = this;

	        var pc = this.pc;
	        var dc = pc.createDataChannel(this.id, { reliable: true });

	        this.setDataChannel(dc);

	        if (this.getMeta instanceof Function) {
	            dc.onopen = function () {
	                return _this.dc.send((0, _utils.stringify)(_this.getMeta()));
	            };
	        }

	        pc.createOffer(function (sdp) {
	            _this.onsdp(sdp);
	        }, handleSDPError, OFFER_ANSWER_CONSTRAINTS);

	        pc.onicecandidate = function (sdp) {
	            return _this.onicecandidate(sdp);
	        };

	        return this;
	    },
	    answer: function answer(sdp) {
	        var _this2 = this;

	        var pc = this.pc;

	        pc.onicecandidate = function (e) {
	            return _this2.onicecandidate(e);
	        };

	        pc.setRemoteDescription(createSDP(sdp));

	        pc.createAnswer(function (sdp) {
	            return _this2.onsdp(sdp);
	        }, handleSDPError, OFFER_ANSWER_CONSTRAINTS);

	        return this;
	    },
	    setDataChannel: function setDataChannel(dc) {
	        var _this3 = this;

	        this.dc = dc;
	        dc.onmessage = function (msg) {
	            return _this3.emit('data', msg.data);
	        };
	        this.emit('ready');
	    },
	    send: function send(msg) {
	        var _this4 = this;

	        if (!this.dc) {
	            this.messages.push(msg);
	            return;
	        }

	        this.dc.send(msg);

	        this.messages.forEach(function (msg) {
	            return _this4.dc.send(msg);
	        });
	        this.messages = [];
	    },
	    onsdp: function onsdp(sdp) {
	        this.pc.setLocalDescription(sdp);
	        this.emit('sdp', sdp);
	    },
	    onicecandidate: function onicecandidate(e) {
	        var candidate = e.candidate;

	        if (candidate) {
	            this.emit('candidate', candidate);
	        }
	    },
	    destroy: function destroy() {
	        this.removeAllListeners();

	        if (this.dc) {
	            this.dc.close();
	        }

	        if (this.pc) {
	            this.pc.close();
	        }
	    }
	}, _eventemitter2.default.prototype);

	var connection = function connection(config) {
	    var _this5 = this;

	    var pc = new RTCPeerConnection(ICE, OPTIONAL);
	    var messages = [];

	    var id = config.id;
	    var pid = config.pid;

	    var props = { id: id, pid: pid, pc: pc, messages: messages, getMeta: config.getMeta || _utils.noop, dc: null };

	    var obj = (0, _utils.create)(proto, props);

	    _eventemitter2.default.call(obj);

	    pc.ondatachannel = function (e) {
	        return obj.setDataChannel(e.channel);
	    };
	    // TODO: below
	    pc.onclose = function (e) {
	        return _this5.emit('close', e);
	    };

	    return obj;
	};

	exports.default = connection;

/***/ }
/******/ ])
});
;