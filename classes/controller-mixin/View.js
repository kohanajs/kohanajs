const {KohanaJS, View, ControllerMixin} = require('../../index');

class ControllerMixinView extends ControllerMixin{
  constructor(client, layout='layout/default', themePath= KohanaJS.VIEW_PATH, viewClass = View.defaultViewClass) {
    super(client);

    this.layout = this.getView(layout, {}, themePath, viewClass);

    this.exports = {
      getView     : (file, data= {}) => this.getView(file, data, themePath, viewClass),
      setTemplate : (file, data= {}) => (this.template = this.getView(file, data, themePath, viewClass)),
      template    : () => this.template,
      view        : () => this.layout,
    }
  }

  async after(){
    //render template and put into layout's main output.
    //no template, replace the controller body string into layout.
    this.layout.data.main = (this.template) ? await this.template.render() : this.client.body;
    this.client.body = await this.layout.render();
  }

  getView(path, data= {}, themePath = KohanaJS.VIEW_PATH, viewClass = View.defaultViewClass){
    return new viewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;