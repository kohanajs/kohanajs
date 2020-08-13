const mysql = require('mysql')

class DatabaseAdapter_MySQL{
  constructor(host, user, password, database, options={}) {
    this.pool = mysql.createPool(Object.assign({
      connectionLimit : 500 ,
      host: host,
      user: user,
      password: password,
      database: database
    }, options));
  }

  parse(sql){
    const query = (...values) => {
      return new Promise((resolve, reject)=>{
        this.pool.query({
          sql: sql,
          timeout: 10000,
          values: values,
        }, (error, results, fields)=>{
          if(error){
            reject(error);
          }else{
            resolve(results || fields);
          }
        });
      });
    }

    return{
      run:query,
      get:query,
      all:query
    }
  }
}

module.exports = DatabaseAdapter_MySQL;