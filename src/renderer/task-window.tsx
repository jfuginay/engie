import React from 'react';
import ReactDOM from 'react-dom/client';
import { TaskWindow } from './components/TaskWindow';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TaskWindow />
  </React.StrictMode>
);