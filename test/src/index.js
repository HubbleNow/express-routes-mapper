import test from 'ava';
import mapRoutes from '../../lib/index';

const routes = {
  'GET /user': 'ClassExportDefault.get',
  'POST /user/:name': 'ClassModuleExports.create',
  'PUT /user/:name/:id': 'FunctionModuleExports.update',
  'DELETE /user/:name/:id': 'Function.Export.Default.destroy',
};

const authRoutes = {
  'POST /user/:name': 'ClassModuleExports.create',
  'PUT /user/:name/:id': 'FunctionModuleExports.update',
  'DELETE /user/:name/:id': 'Function.Export.Default.destroy',
};

const lessAuthRoutes = {
  'GET /user': 'ClassExportDefault.get',
  'GET /userAuthOk': 'ClassExportDefault.get',
};

const nonAuthRoutes = {
  'GET /userOk': 'ClassExportDefault.get',
};

const bodyParser = require('body-parser');
const express = require('express');
const request = require('supertest');


test.beforeEach(async (t) => {
  const mapR = require('../../lib/index');
  const app = await express();// eslint-disable-line
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  t.context.express = app;// eslint-disable-line
  t.context.mapRoutes = mapR; // eslint-disable-line
  return t.context.mapRoutes;
});

test('testing', async (t) => {
  const router = mapRoutes(routes, 'test/fixtures/controllers/');

  // CLASS EXPORT DEFAULT
  // method
  t.is('get', router.stack[0].route.stack[0].method);
  // route
  t.is('/user', router.stack[0].route.path);
  // function name
  t.is('get', router.stack[0].route.stack[0].name);
  // function to call
  t.is('function', typeof (router.stack[0].route.stack[0].handle));

  // CLASS MODULE EXPORTS
  // method
  t.is('post', router.stack[1].route.stack[0].method);
  // route
  t.is('/user/:name', router.stack[1].route.path);
  // keys for route
  t.is('name', router.stack[1].keys[0].name);
  // function name
  t.is('create', router.stack[1].route.stack[0].name);
  // function to call
  t.is('function', typeof (router.stack[1].route.stack[0].handle));

  // FUNCTION MODULE EXPORTS
  // method
  t.is('put', router.stack[2].route.stack[0].method);
  // route
  t.is('/user/:name/:id', router.stack[2].route.path);
  // keys for route
  t.is('name', router.stack[2].keys[0].name);
  t.is('id', router.stack[2].keys[1].name);
  // function name
  t.is('update', router.stack[2].route.stack[0].name);
  // function to call
  t.is('function', typeof (router.stack[2].route.stack[0].handle));

  // FUNCTION EXPORT DEFAULT
  // method
  t.is('delete', router.stack[3].route.stack[0].method);
  // route
  t.is('/user/:name/:id', router.stack[3].route.path);
  // keys for route
  t.is('name', router.stack[3].keys[0].name);
  t.is('id', router.stack[3].keys[1].name);
  // function name
  t.is('destroy', router.stack[3].route.stack[0].name);
  // function to call
  t.is('function', typeof (router.stack[3].route.stack[0].handle));

  t.is('function', typeof (router));

  router.stack = [];
});

test('testing with multiple routes mappings count', async (t) => {
  const superStrictRouter = mapRoutes(authRoutes, 'test/fixtures/controllers/');
  t.truthy(superStrictRouter.stack.length === 3);
  const lessStrictRouter = mapRoutes(lessAuthRoutes, 'test/fixtures/controllers/');
  t.truthy(superStrictRouter.stack.length === 5);
  const openRouter = mapRoutes(nonAuthRoutes, 'test/fixtures/controllers/');
  t.truthy(openRouter.stack.length === 6);

  t.is('function', typeof (superStrictRouter));
  t.is('function', typeof (lessStrictRouter));
  t.is('function', typeof (openRouter));

  t.truthy(superStrictRouter.stack.length === 6);// added to existing router (defined by require)
  superStrictRouter.stack = [];
  t.truthy(lessStrictRouter.stack.length === 0);
  t.truthy(openRouter.stack.length === 0);
});

test('testing with multiple routes mappings that correct all-route mapping is used', async (t) => {
  const mapRoutess = t.context.mapRoutes;
  const superStrictRouter = mapRoutess(authRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('authRoutes'); return req.header('Authorization') === 'SECUDER' ? next() : res.status(401).json({ msg: 'Mein got' }); });
  const lessStrictRouter = mapRoutess(lessAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('lessAuthRoutes'); return req.header('Authorization') === 'BANGBANG' ? next() : res.status(401).json({ msg: 'You are welcome, almost!' }); });
  const openRouter = mapRoutess(nonAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('The way is open'); return next(); });

  t.is('function', typeof (superStrictRouter));
  t.is('function', typeof (lessStrictRouter));
  t.is('function', typeof (openRouter));

  const testapp = t.context.express;

  testapp.use('/sec', superStrictRouter);
  testapp.use('/semipub', lessStrictRouter);
  testapp.use('/pub', openRouter);

  const username = 'MR. USER';
  let authResponse = await request(testapp)
    .post('/sec/user/BANGBANG')
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 401, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Mein got');

  authResponse = await request(testapp)
    .post('/sec/user/BANGBANG')
    .set('Accept', /json/)
    .set('Authorization', 'SECUDER')
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 200, authResponse.text);
  t.truthy(authResponse.text);
  t.is(authResponse.text, `created user: ${username}`);

  const lessAuthResponse = await request(testapp)
    .get('/semipub/user')
    .set('Accept', /json/)
    .set('Authorization', 'BANGBANG')
    .set('Content-Type', 'application/json');
  t.is(lessAuthResponse.status, 200, lessAuthResponse.text);
  t.truthy(lessAuthResponse.text);
  t.is(lessAuthResponse.text, 'get user');

  const fkdUpAuthResponse = await request(testapp)
    .post('/semipub/user/BANGBANG')// route is bound to /sec yet the route seems to be available in other express prefix binding /semipub !!!! bug ??
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'BANGBANG')
    .send();
  t.is(fkdUpAuthResponse.status, 401, fkdUpAuthResponse.text);
  t.truthy(fkdUpAuthResponse.body.msg);
  t.is(fkdUpAuthResponse.body.msg, 'Mein got');// see comment above why not 'You are welcome, almost!'

  authResponse = await request(testapp)
    .post('/sec/user/BANGBANG')
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send();
  t.is(authResponse.status, 401, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Mein got');

  const openResponse = await request(testapp)
  .get('/pub/userOk/')
  .set('Accept', /json/)
  .set('Content-Type', 'application/json');
  t.is(openResponse.status, 200, openResponse.text);
  t.truthy(openResponse.text);
  t.is(openResponse.text, 'get user');

  authResponse = await request(testapp)
    .post('/pub/user/BANGBANG')// route is bound to /sec yet the route seems to be available in other express prefix binding /pub !!!! bug??
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'SECUDER')
    .send({ name: username });
  t.is(authResponse.status, 200, authResponse.text);
  t.truthy(authResponse.text);
  t.is(authResponse.text, `created user: ${username}`);

  superStrictRouter.stack = [];
});
