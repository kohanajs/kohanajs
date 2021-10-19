const DatabaseDriver = require('../../classes/DatabaseDriver');

describe('Database Driver test', () => {
  const datasource = ""

  beforeEach(() => {
  });

  test('test constructor', () => {
    const instance = new DatabaseDriver(datasource);
    expect(typeof instance).toBe('object');
  });

  test('test factory', ()=>{
    const instance = DatabaseDriver.create(datasource);
    expect(typeof instance).toBe('object');
  })

  test('prepare', async ()=>{
    const instance = new DatabaseDriver(datasource);
    const statement = instance.prepare('SELECT * FROM tablesample');
    expect(statement.constructor.name).toBe('DatabaseStatement');
    const mockrun = await statement.run();
    const mockget = await statement.get();
    const mockall = await statement.all();

    expect(mockrun === undefined).toBe(true);
    expect(JSON.stringify(mockget)).toBe('{}');
    expect(JSON.stringify(mockall)).toBe('[]');

    const mockrun1 = await statement.run(1);
    const mockget1 = await statement.get(1);
    const mockall1 = await statement.all(1);

    expect(mockrun1 === undefined).toBe(true);
    expect(JSON.stringify(mockget1)).toBe('{}');
    expect(JSON.stringify(mockall1)).toBe('[]');
  });

  test('transaction', async () => {
    const instance = new DatabaseDriver(datasource);
    await instance.transaction(()=>{});
    expect('no error').toBe('no error');
  })

  test('exec', async () => {
    const instance = new DatabaseDriver(datasource);
    await instance.exec('SELECT * FROM tablesample');
    expect('no error').toBe('no error');
  })

  test('close', async () => {
    const instance = new DatabaseDriver(datasource);
    await instance.close();
    expect('no error').toBe('no error');
  })

  test('transaction fail', async () => {
    const instance = new DatabaseDriver(datasource);
    let isRollback = false;
    instance.transactionRollback = async () =>{
      isRollback = true;
    }
    await instance.transaction(()=>{});
    expect(isRollback).toBe(false);

    try{
      await instance.transaction(()=>{throw new Error('error under transaction')});
    }catch(e){
      expect(e.message).toBe('error under transaction');
    }

    expect(isRollback).toBe(true);
  })
});