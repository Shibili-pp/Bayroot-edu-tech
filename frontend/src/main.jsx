import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Only enable StrictMode in production builds
// In development, StrictMode causes double renders which leads to rate limiting issues
const isProduction = import.meta.env.PROD;

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isProduction) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  root.render(<App />);
}




