import test from 'ava';
import mapRoutes from '../../lib/index';

const authRoutes = {
  'POST /user/:name': { controller: 'ClassModuleExports.create', allowAny: ['SUPER-POST', 'BASIC'] },
  'PUT /user/:name/:id': { controller: 'FunctionModuleExports.update', allowAny: ['SUPER-UPDATE'] },
  'DELETE /user/:name/:id': { controller: 'Function.Export.Default.destroy', allowAny: ['SUPER-DELETE'] },
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

test(async function testWithMultipleRoutesMappingsThatRouteMappingIsUsed(t) {
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;

  const superStrictRouter = mapRoutes(authRoutes, 'test/fixtures/controllers/', (req, res, next) => { console.log('authRoutes'); return req.header('Authorization') === 'SECUDER' ? next() : res.status(401).json({ msg: 'Mein got' }); });
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
    .post(`/semipub${randPart}/user/BANGBANG`)// route is bound to /sec
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'BANGBANG')
    .send();
  t.is(fkdUpAuthResponse.status, 404, fkdUpAuthResponse.text);


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
    .post(`/pub${randPart}/user/BANGBANG`)// route is bound to /sec
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('Authorization', 'SECUDER')
    .send({ name: username });
  t.is(authResponse.status, 404, authResponse.text);
});

test(async function testAccessRightsWithAccessRightedRoutes(t) {
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;

  const theRouter = mapRoutes(authRoutes, 'test/fixtures/controllers/', (req, res, next, accessRights) => res.status(403).json({ msg: `Required one of access rights: ${accessRights}` }));
  expressApp.use(`/sec${randPart}`, theRouter);

  const username = 'MR. USER';
  const authResponse = await request(expressApp)
    .post(`/sec${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .send({ name: username });
  t.is(authResponse.status, 403, authResponse.text);
  t.truthy(authResponse.body.msg);
  t.is(authResponse.body.msg, 'Required one of access rights: SUPER-POST,BASIC');
});

test(async function testAccessRightsWithAllRoutes(t) {
  const randPart = `${Math.floor(Math.random() * 100000000)}${process.pid}`;
  const theRouterRestricted = mapRoutes(authRoutes, 'test/fixtures/controllers/', (req, res, next, accessRights) => {
    if (accessRights.length > 0) {
    // WHATEVER CUSTOM AUTHENTICATION YOU WANT
      if (req.header('X-MY-MAGIC-ACCESS-TOKEN') === 'ISHALLPAZZTHIS') {
        return next();
      }
      console.log('403 JSON accessRights', accessRights, req.method, req.path);
      return res.status(403).json({ msg: `Required one of access rights: ${accessRights}` });
    // WHATEVER CUSTOM AUTHENTICATIO YOU WANT ENDS HERE
    }
    return next();
  });
  const theRouterOpen = mapRoutes(nonAuthRoutes, 'test/fixtures/controllers/', (req, res, next) => next());

  expressApp.use(`/open${randPart}`, theRouterOpen);
  expressApp.use(`/restricted${randPart}`, theRouterRestricted);

  const username = 'MR. USER';
  let authResponse = await request(expressApp)
    .post(`/restricted${randPart}/user/BANGBANG`)
    .set('Accept', /json/)
    .set('Content-Type', 'application/json')
    .set('X-MY-MAGIC-ACCESS-TOKEN', 'ISHALLPAZZTHIS')
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
  t.is(authResponse.body.msg, 'Required one of access rights: SUPER-POST,BASIC');

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

