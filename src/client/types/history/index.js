import sha1 from 'sha-1';
import { stringify, create } from '../../utils';

const proto = {

    // [Symbol.iterator]: function* () {
    //     var node = this.nodes[this.tail];
    //     while (node) {
    //         yield node;
    //         node = this.nodes[node.r];
    //     }
    // },

    import(history) {
        // TODO: sanitize input
        // TODO: handle when maximumRevisions is set
        this.nodes = history.nodes;
        this.length = history.length;
        this.tail = history.tail;
        this.head = history.head;
    },

    export() {
        return {
            nodes: this.nodes,
            length: this.length,
            head: this.head,
            tail: this.tail
        };
    },

    push(data) {
        const id = this.createNode({ data, l: this.head });

        if (this.head) {
            this.nodes[this.head].r = id;
        }

        this.head = id;

        if (!this.tail) {
            this.tail = id;
        }

        return id;
    },

    pop() {
        if (!this.tail) {
            return null;
        }

        const node = this.nodes[this.tail];
        const item = {};

        item[this.tail] = node;

        delete this.nodes[this.tail];

        if (this.length > 1) {
            this.tail = node.r;
        } else {
            this.tail = null;
            this.head = null;
        }

        this.length--;

        return item;
    },

    insert(spec) {
        var { l, data, id } = spec;

        l = l || this.head;

        if (l === this.head) {
            return this.push(data);
        }

        l = this.nodes[l];
        var r = this.nodes[l.r];

        // l <- newNode -> r
        id = this.createNode({ l, data, r: l.r, id });

        // l -> newNode
        l.r = id;

        // newNode <- r
        r.l = id;

        this.length += 1;
        
        if (this.maxLength && this.length > this.maxLength) {
            this.pop();
        }

        return id;
    },

    createNode(spec) {
        var { data, l, r, id } = spec;

        id = id || sha1(stringify({ l, data }));

        this.nodes[id] = { data, l, r };

        return id;
    },

    has(id) {
        return id in this.nodes;
    },

    get(id) {
        return this.nodes[id] || null;
    },

    sequence(id) {
        var node = this.nodes[id];

        if (!node) {
            return null;
        }

        const sequence = [];

        while (node = this.nodes[node.r]) {
            sequence[sequence.length] = node.data;
        }

        return sequence;
    }

};

const history = function (spec = {}) {
    const props = {
        head: null,
        tail: null,
        nodes: {},
        length: 0,
        maxLength: spec.maxLength || Infinity
    };

    const obj = create(proto, props);

    return obj;
};

export default history;