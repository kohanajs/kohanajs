const { ControllerMixin } = require('@kohanajs/core-mvc');
const mime = require('mime');

class Mime extends ControllerMixin {
  static init(state) {
    const client = state.get('client');
    const { request } = client;
    client.headers['Content-Type'] = `${mime.getType(request.url) || 'text/html'}; charset=utf-8`;
  }
}

module.exports = Mime;
