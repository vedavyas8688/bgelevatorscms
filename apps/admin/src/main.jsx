import React from 'react';import {createRoot} from 'react-dom/client';import {BrowserRouter} from 'react-router-dom';import App from './App.jsx';import './styles.css';import './new-post.css';import './clean-urls.css';import './editor-clarity.css';import './dashboard.css';
createRoot(document.getElementById('root')).render(<BrowserRouter basename="/admin"><App/></BrowserRouter>);
