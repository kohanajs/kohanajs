const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const ORM = require('../classes/ORM');
KohanaJS = require('../KohanaJS');
KohanaJS.init();

class Baby extends ORM{
  name;

  static joinTablePrefix = 'baby';
  static tableName = 'babies';
  static fields = new Map([
    ['name', 'String'],
  ]);

  static hasMany = [
    ['baby_id', 'Toy'],
  ];
}

class Toy extends ORM{
  name;
  baby_id;

  static joinTablePrefix = 'toy';
  static tableName = 'toys';
  static fields = new Map([
    ['name', 'String'],
  ]);
  static belongsToMany = new Set(['Tag']);
}

class Tag extends ORM{
  name
  static tableName = 'tags';
  static joinTablePrefix = 'tag';
}

KohanaJS.classPath.set('model/Baby.js', Baby);
KohanaJS.classPath.set('model/Toy.js', Toy);
KohanaJS.classPath.set('model/Tag.js', Tag);
const db = (()=>{
  //make blank database
  const targetPath = path.normalize(__dirname+'/db/empty.sqlite');
  const sourcePath = path.normalize(__dirname+'/db/empty.default.sqlite');
  if(fs.existsSync(targetPath))fs.unlinkSync(targetPath);

  fs.copyFileSync(sourcePath, targetPath);
  const db = new Database(targetPath);

  db.exec(`CREATE TABLE babies(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
name TEXT); 

CREATE TRIGGER babies_updated_at AFTER UPDATE ON babies WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE babies SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;`);

  db.exec(`CREATE TABLE toys(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
name TEXT,
baby_id INTEGER NOT NULL,
FOREIGN KEY (baby_id) REFERENCES babies (id) ON DELETE CASCADE
);

CREATE TRIGGER toys_updated_at AFTER UPDATE ON toys WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE toys SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;`);

  db.exec(`CREATE TABLE tags(
id INTEGER UNIQUE DEFAULT ((( strftime('%s','now') - 1563741060 ) * 100000) + (RANDOM() & 65535)) NOT NULL ,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL ,
name TEXT
);

CREATE TRIGGER tags_updated_at AFTER UPDATE ON tags WHEN old.updated_at < CURRENT_TIMESTAMP BEGIN
UPDATE tags SET updated_at = CURRENT_TIMESTAMP WHERE id = old.id;
END;`);

  db.exec(`CREATE TABLE toy_tags(
    toy_id INTEGER NOT NULL ,
    tag_id INTEGER NOT NULL ,
    weight REAL ,
    UNIQUE(toy_id, tag_id) ,
    FOREIGN KEY (toy_id) REFERENCES toys (id) ON DELETE CASCADE ,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);`);

  ORM.database = db;
  return db;
})();

describe('ORM coverage test', function () {
  beforeEach( () => {
    db.exec(`
INSERT INTO babies (id, name) VALUES (1, 'Alice');
INSERT INTO babies (id, name) VALUES (2, 'Bob');

INSERT INTO toys (id, name, baby_id) VALUES (1, 'Bear', 1);
INSERT INTO toys (id, name, baby_id) VALUES (2, 'Fish', 1);
INSERT INTO toys (id, name, baby_id) VALUES (3, 'Woody', 1);
INSERT INTO toys (id, name, baby_id) VALUES (4, 'Puppy', 2);

INSERT INTO tags (id, name) VALUES (1, 'red');
INSERT INTO tags (id, name) VALUES (2, 'green');
INSERT INTO tags (id, name) VALUES (3, 'blue');
INSERT INTO tags (id, name) VALUES (4, 'yellow');
`);
  });

  afterEach( () => {
    db.exec(`DELETE FROM babies`);
    db.exec(`DELETE FROM toys`);
    db.exec(`DELETE FROM tags`);
    db.exec(`DELETE FROM toy_tags`);
  });

  test('children default Model', async()=>{
    const alice = await ORM.factory(Baby, 1);
    const toys = await alice.children('baby_id');
    expect(toys).toHaveLength(3);
  });

  test('children add models', async()=>{
    const tags = await ORM.readAll(Tag);
    expect(tags).toHaveLength(4);
    const toy = await ORM.factory(Toy, 1)
    await toy.add([tags[0], tags[1]]);

    const t1 = await toy.siblings(Tag);
    expect(t1).toHaveLength(2);

    await toy.add(tags[2]);
    const t2 = await toy.siblings(Tag);
    expect(t2).toHaveLength(3);

    const verify = db.prepare('SELECT * FROM toy_tags').all()
    expect(verify).toHaveLength(3);

    try{
      await toy.siblings(Baby);
    }catch(e){
      expect(e.message).toBe('Toy not have sibling type Baby')
    }
  });

  test('new model add sibling', async () => {
    const toy = ORM.create(Toy);
    const tag = await ORM.factory(Tag, 1);
    try{
      await toy.add(tag);
    }catch(e){
      expect(e.message).toBe('Cannot add Tag. Toy not have id')
    }

    try{
      await toy.remove(tag);
    }catch(e){
      expect(e.message).toBe('Cannot remove Tag. Toy not have id')
    }

    try{
      await toy.removeAll(Tag);
    }catch(e){
      expect(e.message).toBe('Cannot remove Tag. Toy not have id')
    }

  })

  test('children remove models', async()=>{
    const tags = await ORM.readAll(Tag);
    const toy = await ORM.factory(Toy, 1)
    await toy.add(tags);

    await toy.remove(tags[0])
    const t2 = await toy.siblings(Tag);
    expect(t2).toHaveLength(3);

    await toy.remove([tags[1], tags[3]])

    const verify = db.prepare('SELECT * FROM toy_tags').all();
    expect(verify).toHaveLength(1);
  });


});