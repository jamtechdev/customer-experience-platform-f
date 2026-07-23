// Dev proxy: local backend by default.
// Override: PROXY_TARGET=https://api.sentimenter.ai npm start
const target = process.env.PROXY_TARGET || 'http://localhost:5000';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
  '/socket.io': {
    target,
    secure: false,
    changeOrigin: true,
    ws: true,
    logLevel: 'debug',
  },
};
