const {ControllerMixin} = require("@kohanajs/core-mvc");
const mime = require('mime');

class Mime extends ControllerMixin{
  constructor(client, headers) {
    super(client);
    headers['Content-Type'] = (mime.getType(this.request.raw.url) || 'text/html') + '; charset=utf-8';
  }
}

module.exports = Mime;