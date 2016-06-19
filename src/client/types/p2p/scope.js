import EventEmitter from 'eventemitter3';

import { c } from '../../utils';

const proto = c(EventEmitter.prototype, {
    
    send(msg) {
        this.connections.forEach((conn) => conn.send(msg))
        return false;
    }

});

// A scope is a list of connections associated with an id (string). When a one
// of its connections sends arbitrary data, it will emit a 'message' event.
function scope (id) {
    const props = {
        connections: []
    };

    const obj = c(proto, props);

    EventEmitter.call(obj);

    return obj;
}

export default scope;