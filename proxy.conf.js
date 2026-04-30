// Dev-time proxy: all /api requests from localhost (any port) go to local backend.
module.exports = {
  '/api': {
    // Local development: send /api requests to local backend on port 5000.
    target: 'http://localhost:5000',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
