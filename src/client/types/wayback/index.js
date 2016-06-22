// Adopted from hharnisc/wayback

import sha1 from 'sha-1';

import { create, uuid, stringify } from '../../utils';

const proto = {

    importModel(model) {
        // TODO: sanitize input
        // TODO: handle when maximumRevisions is set
        this.model = model.model;
        this.modelLength = model.length;
        this.tail = model.tail;
        this.head = model.head;
    },

    exportModel() {
        return {
            model: this.model,
            length: this.modelLength,
            head: this.head,
            tail: this.tail
        };
    },

    hasRevision(r) {
        return r in this.model;
    },

    getRevision(r) {
        return this.hasRevision(r) ? this.model[r] : null;
    },

    getSequence(r) {
        if (!this.hasRevision(r)) {
            return null;
        }

        let sequence = [];
        let curRevision = this.model[r].child;

        while (curRevision) {
            let curModel = this.model[curRevision];
            sequence.push(curModel.data);
            curRevision = curModel.child;
        }

        return sequence;
    },

    push(data, r = null) {
        // create a new node
        let id = this.createNode(this.head, data, r);

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

    pop() {
        // if empty return null
        if (!this.tail) {
            return null;
        }

        // get the current tail item
        let modelItem = this.model[this.tail];
        let item = {};

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

    insert(parent, data, r = null) {
        // unknown parent
        if (!this.hasRevision(parent)) {
            return null;
        }

        // just do a push op when inserting to head
        if (parent === this.head) {
            return this.push(data, r);
        }

        let parentModel = this.model[parent];
        let childModel = this.model[parentModel.child];

        // create a new node with links:
        // parent <- newNode -> child
        let insertId = this.createNode(
            parent,
            data,
            parentModel.child,
            r
        );

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

    createNode(parent, data, child = null, r = null) {
        r = r || sha1(stringify({ parent, data }));

        // create a new node
        this.model[r] = { data, parent, child };

        return r;
    }

};

const wayback = function (maxRevisions = null) {
    const props = {
        model: {},
        modelLength: 0,
        head: null,
        tail: null,
        maxRevisions
    };

    const obj = create(proto, props);

    return obj;
}

export default wayback;