import React from 'react';
import { createRoot } from 'react-dom/client';


const startup = () => {
    const container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);

    const root = createRoot(container);
    root.render(<h1>Hello, worldxx!</h1>);
};

startup();
