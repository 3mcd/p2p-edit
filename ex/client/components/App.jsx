import React from 'react';
import CodeMirror from 'codemirror';
import p2pedit from '../../../dist/p2p-edit';

var client = p2pedit();

var App = React.createClass({

    getInitialState () {
        return {
            text: ''
        };
    },

    componentWillMount () {
        client.on('ready', function () {
            console.log(client);
        })
        // this.model = client.model(this.props.model);
    },

    componentWillUnmount() {
        
    },

    componentDidMount() {
        const editor = CodeMirror.fromTextArea(this.$editor, {
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            fixedGutter: true,
            mode: 'javascript',
            foldGutter: true,
            inputStyle: 'textarea',
            autofocus: true
        });

        // this.model.adapter(client.adapters.CM, editor);
    },

    render () {
        return <textarea ref={(c) => this.$editor = c}></textarea>;
    }

});

export default App;