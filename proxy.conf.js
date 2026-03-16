// Dev-time proxy to avoid CORS issues when calling the backend from http://localhost:4200
// All requests starting with /api will be forwarded to the remote server.
module.exports = {
  '/api': {
    target: 'https://139.162.159.201',
    secure: false,
    changeOrigin: true,
  },
};
