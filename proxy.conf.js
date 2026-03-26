// Dev-time proxy: all /api requests from localhost (any port) go to https://api.sentimenter.ai
// so login/APIs work same as Postman without CORS. Browser sees same-origin /api.
module.exports = {
  '/api': {
    // Local development: send /api requests to the local backend.
    // (Angular interceptor may rewrite full API URLs into /api/* to avoid CORS.)
    target: 'https://api.sentimenter.ai',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
