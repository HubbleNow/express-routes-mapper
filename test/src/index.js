import test from 'ava';
import * as mapRoutez from '../../lib/index';
import { access } from 'fs';


const routes = {
  'GET /user': 'ClassExportDefault.get',
  'POST /user/:name': 'ClassModuleExports.create',
  'PUT /user/:name/:id': 'FunctionModuleExports.update',
  'DELETE /user/:name/:id': 'Function.Export.Default.destroy',
};

const authRoutes = {
  'POST /user/:name': { controller: 'ClassModuleExports.create', accessRights: ['SUPER'] },
  'PUT /user/:name/:id': { controller: 'FunctionModuleExports.update', accessRights: ['SUPER'] },
  'DELETE /user/:name/:id': { controller: 'Function.Export.Default.destroy', accessRights: ['SUPER'] },
};

const lessAuthRoutes = {
  'GET /user': { controller: 'ClassExportDefault.get' },
  'GET /userAuthOk': { controller: 'ClassExportDefault.get' },
};

const nonAuthRoutes = {
  'GET /userOk': { controller: 'ClassExportDefault.get' },
};

const bodyParser = require('body-parser');
const express = require('express');
const request = require('supertest');

let expressApp;


test.before(async () => {
  expressApp = await express();// eslint-disable-line
  expressApp.use(bodyParser.urlencoded({ extended: false }));
  expressApp.use(bodyParser.json());
});

test.beforeEach(async (t) => {
  t.context.mapRoutes = mapRoutez.mapRoutes;// eslint-disable-line
  mapRoutez.resetRouter(); // TODO: Does not work why??????
  return t.context.mapRoutes;
});

test(async function testBasicRouterStackContents(t) {
  const mapRoutes = t.context.mapRoutes;
  mapRoutez.resetRouter();// workaround see beforeEach

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
});

test(async function testWithMultipleRoutesMappingsCount(t) {
  const mapRoutes = t.context.mapRoutes;
  mapRoutez.resetRouter();// workaround see beforeEach

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

test(async function testWithMultipleRoutesMappingsThatRouteMappingIsUsed(t) {
  const mapRoutes = t.context.mapRoutes;
  mapRoutez.resetRouter();// workaround see beforeEach
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;

  /* BASICALLY using mapRoutes multiple times is 'wrong by design' See stack-lengths for example !!! */
  const authRoutesCopy = Object.assign({}, authRoutes);
  const superStrictRouter = mapRoutes(authRoutesCopy, 'test/fixtures/controllers/', (req, res, next) => { console.log('authRoutes'); return req.header('Authorization') === 'SECUDER' ? next() : res.status(401).json({ msg: 'Mein got' }); });
  const lessStrictRouter = mapRoutes(lessAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('lessAuthRoutes'); return req.header('Authorization') === 'BANGBANG' ? next() : res.status(401).json({ msg: 'You are welcome, almost!' }); });
  const openRouter = mapRoutes(nonAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('The way is open'); return next(); });

  t.is('function', typeof (superStrictRouter));
  t.is('function', typeof (lessStrictRouter));
  t.is('function', typeof (openRouter));

  expressApp.use(`/sec${randPart}`, superStrictRouter);
  expressApp.use(`/semipub${randPart}`, lessStrictRouter);
  expressApp.use(`/pub${randPart}`, openRouter);

  const username = 'MR. USER';
  let authResponse = await request(expressApp)
    .post(`/sec${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 401, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Mein got');

  authResponse = await request(expressApp)
    .post(`/sec${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Authorization', 'SECUDER')
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 200, authResponse.text);
  t.truthy(authResponse.text);
  t.is(authResponse.text, `created user: ${username}`);

  const lessAuthResponse = await request(expressApp)
    .get(`/semipub${randPart}/user`)
    .set('Accept', /json/)
    .set('Authorization', 'BANGBANG')
    .set('Content-Type', 'application/json');
  t.is(lessAuthResponse.status, 200, lessAuthResponse.text);
  t.truthy(lessAuthResponse.text);
  t.is(lessAuthResponse.text, 'get user');

  const fkdUpAuthResponse = await request(expressApp)
    .post(`/semipub${randPart}/user/BANGBANG`)// route is bound to /sec yet the route seems to be available in other express prefix binding /semipub !!!! bug ??
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'BANGBANG')
    .send();
  t.is(fkdUpAuthResponse.status, 401, fkdUpAuthResponse.text);
  t.truthy(fkdUpAuthResponse.body.msg);
  t.is(fkdUpAuthResponse.body.msg, 'Mein got');// see comment above why not 'You are welcome, almost!'

  authResponse = await request(expressApp)
    .post(`/sec${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send();
  t.is(authResponse.status, 401, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Mein got');

  const openResponse = await request(expressApp)
  .get(`/pub${randPart}/userOk/`)
  .set('Accept', /json/)
  .set('Content-Type', 'application/json');
  t.is(openResponse.status, 200, openResponse.text);
  t.truthy(openResponse.text);
  t.is(openResponse.text, 'get user');

  authResponse = await request(expressApp)
    .post(`/pub${randPart}/user/BANGBANG`)// route is bound to /sec yet the route seems to be available in other express prefix binding /pub !!!! bug??
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'SECUDER')
    .send({ name: username });
  t.is(authResponse.status, 200, authResponse.text);
  t.truthy(authResponse.text);
  t.is(authResponse.text, `created user: ${username}`);
});

test(async function testAccessRightsWithAccessRightedRoutes(t) {
  const mapRoutes = t.context.mapRoutes;
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;
  mapRoutez.resetRouter();// workaround see beforeEach

  const theRouter = mapRoutes(authRoutes, 'test/fixtures/controllers/', (req, res, next, accessRights) => res.status(403).json({ msg: `Required one of access rights: ${accessRights}` }));
  expressApp.use(`/sec${randPart}`, theRouter);
  t.truthy(theRouter.stack.length === 3);

  const username = 'MR. USER';
  const authResponse = await request(expressApp)
    .post(`/sec${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 403, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Required one of access rights: SUPER');
});

test(async function testAccessRightsWithAllRoutes(t) {
  const mapRoutes = t.context.mapRoutes;
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;
  mapRoutez.resetRouter();// workaround see beforeEach

  const theRouterRestricted = mapRoutes(authRoutes, 'test/fixtures/controllers/', (req, res, next, accessRights) => {
    if (accessRights.length > 0) {
    // WHATEVER CUSTOM AUTHENTICATION YOU WANT
      if (req.header('X-MY-MAGIC-PASS') === 'ISHALLPAZZTHIS') {
        return next();
      }
      return res.status(403).json({ msg: `Required one of access rights: ${accessRights}` });
    }
    return next();
  });
  mapRoutez.resetRouter();// workaround see beforeEach
  const theRouterOpen = mapRoutes(nonAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => next());

  expressApp.use(`/open${randPart}`, theRouterOpen);
  expressApp.use(`/restricted${randPart}`, theRouterRestricted);

  t.truthy(theRouterOpen.stack.length === 1);
  t.truthy(theRouterRestricted.stack.length === 3);

  const username = 'MR. USER';
  let authResponse = await request(expressApp)
    .post(`/restricted${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('X-MY-MAGIC-PASS', 'ISHALLPAZZTHIS')
    .send({ name: username });
  t.is(authResponse.status, 200, authResponse.text);
  t.truthy(authResponse.text);
  t.is(authResponse.text, 'created user: MR. USER');

  authResponse = await request(expressApp)
    .post(`/restricted${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 403, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Required one of access rights: SUPER');

  const openResponse = await request(expressApp)
  .get(`/open${randPart}/userOk/`)
  .set('Accept', /json/)
  .set('Content-Type', 'application/json');
  t.is(openResponse.status, 200, openResponse.text);
  t.truthy(openResponse.text);
  t.is(openResponse.text, 'get user');

  const shouldNotBeFoundResponse = await request(expressApp)
    .post(`/open${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(shouldNotBeFoundResponse.status, 404, shouldNotBeFoundResponse.text);
});

