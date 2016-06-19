const { create, assign } = Object;
const c = (proto, props) => {
    if (Array.isArray(proto)) {
        proto = proto.reduce(c);
    }
    if (Array.isArray(props)) {
        Object.assign(props[0], ...props.slice(1));
    }
    return assign(create(proto), props);
};

const noop = () => false;

const s4 = () =>
    Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);

const uuid = () =>
    s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();

const stringify = JSON.stringify;

export { create, assign, c, noop, uuid, stringify }