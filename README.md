# KohanaJS
Node.js MVC structure base on Kohana Framework, 
With ORM using better-sqlite3

### Getting started


The file structure
```
-- server
 L application
   L classes
   L config
   L logs
   L views
   - bootstrap.js
 L modules
   L example-module
     L index.js
     L init.js
     L classes
     L views
 L system
 - main.js
```

## Bootstrap
module.exports = {
  modules: [
    //place modules name here.
  ],
};

## ORM
ORM provide following static variables:

- ORM.tableName
  - table name of the class
- ORM.jointTablePrefix
- ORM.belongsTo
  - list of the class belongs
- ORM.hasMany 
- ORM.belongsToMany


## Controller
Controller provide basic flow of execution.
1. constructor
2. before
3. action_xxx
4. after

it also provide basic function
1. redirect(location);
2. notFound(msg);

default action:
1. action_index

## Controller Mixin
We can use extends to provide addition features to controller, but it will increase complexity and unused functions to child classes.

Controller Mixin introduced to prevent problems create by extends.

```
//sample controller mixin
class SampleMixin extends ControllerMixin{

//client is a controller
constructor(client)

//add function on before
async before()
async after()

//manually called by client controller
action_index()
action_something()

//additional functions
getView(path, data)
moreFunctions(arg)

}
```
sample code to add mixin in controller

```

class ControllerView extends Controller{
  constructor(request, response){
    super(request, response);
    //add mixin in constructor
    this.addMixin(new SampleMixin(this));
  }
  
  action_index(){
    this.tpl = this.getView('home', {});
  }
}

```