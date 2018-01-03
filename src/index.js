import entries from 'object.entries';
import express from 'express';
import path from 'path';

import splitByLastDot from './helpers/splitByLastDot';
import isConstructor from './helpers/isConstrutor';

let router = express.Router();
const cwd = process.cwd();

const resetRouter = () => {
  router = express.Router();
  return router;
};

const mapRoutes = (routes, pathToController, routesFunction) => {
  let requestMethodPath;
  let requestMethod;

  let controllerMethod;
  let controller;
  let accessRightsForMethod;
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
    accessRightsForMethod = value[1].accessRights || [];

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

    const routePath = router.route(myPath);
    if (routesFunction) {
      routePath.all((req, res, next) => routesFunction(req, res, next, accessRightsForMethod));
    }
    if (requestMethod === 'get') {
      routePath.get(contr[controllerMethod]);
    } else if (requestMethod === 'post') {
      routePath.post(contr[controllerMethod]);
    } else if (requestMethod === 'put') {
      routePath.put(contr[controllerMethod]);
    } else if (requestMethod === 'delete') {
      routePath.delete(contr[controllerMethod]);
    }
  });

  return router;
};

export { mapRoutes, resetRouter };
