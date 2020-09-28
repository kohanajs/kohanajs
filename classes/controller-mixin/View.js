const {ControllerMixin, View} = require("@kohanajs/core-mvc");

class ControllerMixinView extends ControllerMixin{
  /** @type {View} */
  template = null;
  /** @type {View} */
  errorTemplate = null;

  constructor(client, layout='layout/default', placeHolder = 'main', themePath= null, viewClass = View.defaultViewClass) {
    super(client);

    this.layout = this.getView(layout, {}, themePath, viewClass);
    this.placeHolder = placeHolder;

    this.exports = {
      getView          : (file, data= {}) => this.getView(file, data, themePath, viewClass),
      setTemplate      : (file, data= {}) => (this.template = this.getView(file, data, themePath, viewClass)),
      setErrorTemplate : (file, data= {}) => (this.errorTemplate = this.getView(file, data, themePath, viewClass)),
      template         : () => this.template,
      errorTemplate    : () => this.errorTemplate,
      layout           : () => this.layout,
    }
  }

  async after(){
    //render template and put into layout's main output.
    //no template, replace the controller body string into layout.
    this.layout.data[this.placeHolder] = (this.template) ? await this.template.render() : this.client.body;
    this.client.body = await this.layout.render();
  }

  async exit(code){
    if(code === 302) return;
    if(this.errorTemplate){
      Object.assign(this.errorTemplate.data, {body: this.client.body});
      this.layout.data[this.placeHolder] = await this.errorTemplate.render();
    }else{
      this.layout.data[this.placeHolder] = this.client.body;
    }
    this.client.body = await this.layout.render();
  }

  getView(path, data, themePath, viewClass){
    return new viewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;