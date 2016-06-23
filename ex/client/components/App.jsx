import React from 'react';
import CodeMirror from 'codemirror';
import p2pedit from '../../../dist/p2p-edit';
import cmAdapter from '../cm-adapter';

const client = p2pedit({
    server: 'ws://' + document.domain + ':12034'
});

window.client = client;

const App = React.createClass({

    componentWillMount () {
        client.on('ready', () => {
            this.model = client.model(this.props.model);
            this.model.adapter(cmAdapter, this.editor);
        });
    },

    componentWillUnmount() {
        
    },

    componentDidMount() {
        this.editor = window.editor = CodeMirror.fromTextArea(this.$editor, {
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            fixedGutter: true,
            mode: 'javascript',
            foldGutter: true,
            inputStyle: 'textarea',
            autofocus: true
        });
    },

    render () {
        return <textarea ref={(c) => this.$editor = c}></textarea>;
    }

});

export default App;