const {ControllerMixin, View} = require("@kohanajs/core-mvc");

class ControllerMixinView extends ControllerMixin{
  static LAYOUT_FILE = 'layoutFile';
  static PLACEHOLDER = 'placeHolder';
  static VIEW_CLASS  = 'viewClass';
  static THEME_PATH = 'themePath';
  static LAYOUT = 'layout';
  static TEMPLATE = 'template';
  static ERROR_TEMPLATE = 'errorTemplate';

  static init(state){
    if(!state.get(this.LAYOUT_FILE))state.set(this.LAYOUT_FILE, 'layout/default');
    if(!state.get(this.PLACEHOLDER))state.set(this.PLACEHOLDER, 'main');
    if(!state.get(this.VIEW_CLASS))state.set(this.VIEW_CLASS, View.defaultViewClass);
    if(!state.get(this.LAYOUT))state.set(this.LAYOUT, ControllerMixinView.getView(state.get(this.LAYOUT_FILE), {}, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)))

    const client = state.get('client');
    client.getView          = (file, data= {}) => ControllerMixinView.getView(file, data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS));
    client.setTemplate      = (file, data= {}) => state.set(this.TEMPLATE,      (typeof file === 'string') ? ControllerMixinView.getView(file, data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)) : file);
    client.setLayout        = (file, data= {}) => state.set(this.LAYOUT,        (typeof file === 'string') ? ControllerMixinView.getView(file, data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)) : file);
    client.setErrorTemplate = (file, data= {}) => state.set(this.ERROR_TEMPLATE, (typeof file === 'string') ? ControllerMixinView.getView(file, data, state.get(this.THEME_PATH), state.get(this.VIEW_CLASS)) : file);
  }

  static async after(state){
    const client = state.get('client');
    if(client.headers && client.headers['Content-Type'] === 'application/json; charset=utf-8'){
      client.body = JSON.stringify(client.body);
      return;
    }
    //render template and put into layout's main output.
    //no template, replace the controller body string into layout.
    const template = state.get(this.TEMPLATE);
    const layout = state.get(this.LAYOUT);
    layout.data[state.get(this.PLACEHOLDER)] = template ? await template.render() : client.body;
    client.body = await layout.render();
  }

  static async exit(state){
    const client = state.get('client');
    const code = client.status;
    if(code === 302) return;
    if(client.headers && client.headers['Content-Type'] === 'application/json; charset=utf-8'){
      client.body = JSON.stringify(client.body);
      return;
    }
    const errorTemplate = state.get(this.ERROR_TEMPLATE);
    const layout = state.get(this.LAYOUT);
    const placeHolder = state.get(this.PLACEHOLDER);

    if(errorTemplate){
      Object.assign(errorTemplate.data, {body: client.body});
      layout.data[placeHolder] = await errorTemplate.render();
    }else{
      layout.data[placeHolder] = client.body;
    }
    client.body = await layout.render();
  }

  static getView(path, data, themePath, viewClass){
    return new viewClass(path, data, themePath);
  }
}

module.exports = ControllerMixinView;