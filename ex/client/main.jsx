import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/app.jsx';

var $app = document.getElementById('app');
var $app2 = document.getElementById('app2');
var $app3 = document.getElementById('app3');
var $app4 = document.getElementById('app4');

var model = window.location.hash.replace('#', '');

ReactDOM.render(<App model={model} />, $app);
ReactDOM.render(<App model={model} />, $app2);
ReactDOM.render(<App model={'test'} />, $app3);
ReactDOM.render(<App model={'test'} />, $app4);