import entries from 'object.entries';
import express from 'express';
import path from 'path';

import splitByLastDot from './helpers/splitByLastDot';
import isConstructor from './helpers/isConstrutor';

let router = express({ strict: false });// is a subapp > router
const cwd = process.cwd();

const resetRouter = () => {
  router = express({ strict: false });// is a subapp > router
  return router;
};

const mapRoutes = (routes, pathToController, routesFunction) => {
  resetRouter();

  let requestMethodPath;
  let requestMethod;

  let controllerMethod;
  let controller;
  let contr;

  let handler;

  let myPath;
  const myPathToController = path.join(cwd, pathToController);

  const routesArr = entries(routes);

  routesArr.forEach((value) => {
    requestMethodPath = value[0].replace(/\s\s+/g, ' ');
    requestMethod = (requestMethodPath.split(' ')[0]).toLocaleLowerCase();
    myPath = requestMethodPath.split(' ')[1];
    controller = value[1].controller ? splitByLastDot(value[1].controller)[0] : splitByLastDot(value[1])[0];
    controllerMethod = value[1].controller ? splitByLastDot(value[1].controller)[1] : splitByLastDot(value[1])[1];
    const allowedRightsForMethod = value[1].allowAny || [];

    try {
      handler = require(`${myPathToController}${controller}`);

      const isConstructable = isConstructor(handler);

      if (isConstructable) {
        contr = new handler();
      } else {
        contr = handler();
      }
    } catch (err) {
      require('babel-register');
      handler = require(`${myPathToController}${controller}`).default;
      contr = new handler();
    }
    const funcs = routesFunction ? [(req, res, next) => routesFunction(req, res, next, allowedRightsForMethod), contr[controllerMethod]] : [contr[controllerMethod]];
    if (requestMethod === 'get') {
      router.get(myPath, funcs);
    } else if (requestMethod === 'post') {
      router.post(myPath, funcs);
    } else if (requestMethod === 'put') {
      router.put(myPath, funcs);
    } else if (requestMethod === 'delete') {
      router.delete(myPath, funcs);
    }
  });
  return router;
};

export default mapRoutes;
