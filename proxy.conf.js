// Proxy /api requests to the local backend during development.
module.exports = {
  '/api': {
    target: 'http://localhost:5000',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
