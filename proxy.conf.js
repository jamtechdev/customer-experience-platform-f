// Dev-time proxy: all /api requests from localhost (any port) go to https://api.sentimenter.ai
// so login/APIs work same as Postman without CORS. Browser sees same-origin /api.
module.exports = {
  '/api': {
    target: 'https://api.sentimenter.ai',
    secure: true,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
