import { Router } from "express";
import { registerRouter } from "./registerRoute.js";
import { paymentsRouter } from "./paymentsRoute.js";
import { authRouter } from "./authRoute.js";
import { meRouter } from "./meRoute.js";
import { classesRouter } from "./classesRoute.js";
import { programRouter } from "./programRoute.js";
import { adminRouter } from "./adminRoute.js";
import { adminCorporateRouter } from "./adminCorporateRoute.js";
import { adminClassesRouter } from "./adminClassesRoute.js";
import { teacherRouter } from "./teacherRoute.js";
export const v1Router = Router();
v1Router.use(registerRouter);
v1Router.use(paymentsRouter);
v1Router.use(authRouter);
v1Router.use(meRouter);
v1Router.use(classesRouter);
v1Router.use(programRouter);
v1Router.use("/teacher", teacherRouter);
/**
 * `adminRouter` must be first under `/admin`: it defines `POST /login` before `authAdmin`.
 * `adminClassesRouter` / `adminCorporateRouter` apply `authAdmin` to all subpaths — if they ran
 * first, login would always return NO_TOKEN.
 */
v1Router.use("/admin", adminRouter);
v1Router.use("/admin", adminClassesRouter);
v1Router.use("/admin", adminCorporateRouter);
