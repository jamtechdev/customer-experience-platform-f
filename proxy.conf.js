// Proxy /api requests to the local backend during development.
module.exports = {
  '/api': {
    target: 'https://api.sentimenter.ai',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
