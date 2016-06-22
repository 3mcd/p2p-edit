const normalizePos = (lengths, pos) => lengths.reduce((a, x, i) => i < pos.line ? a + x : a, 0) + pos.ch;

function cmAdapter(model, sync, editor) {
    const handleChange = (cm, change) => {
        const { from, to, origin, removed } = change;
        const text = change.text.join('\n');
        const lines = model.get().split('\n');
        const l = lines.map((x, i) => (i < lines.length - 1 && lines.length > 1) ? x.length + 1 : x.length);
        const pos = [
            normalizePos(l, from),
            normalizePos(l, to)
        ];

        switch (origin) {
            case '+input':
                if (removed && removed[0]) {
                    model.delete(pos[0], pos[1] - pos[0]);
                }
                model.insert(pos[0], text);
                break;
            case '+delete':
            case 'drag':
            case 'cut':
                model.delete(pos[0], pos[1] - pos[0]);
                break;
            case 'paste':
            case 'undo':
            case 'redo':
                model.delete(pos[0], pos[1] - pos[0]);
                model.insert(pos[0], text);
                break;
            default:
                return;
        }

        sync();
    }

    const install = () => {
        editor.on('change', handleChange);
        model.addListener('remoteOp', update);
    }

    const uninstall = () => {
        editor.off('change', handleChange);
        model.removeListener('remoteOp', update);
    }

    const update = () => editor.setValue(model.get());

    return { install, uninstall, update };
}

export default cmAdapter;