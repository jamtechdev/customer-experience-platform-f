// Proxy /api requests to deployed backend.
module.exports = {
  '/api': {
    target: 'https://api.sentimenter.ai',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
