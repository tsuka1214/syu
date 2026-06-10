import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportsRouter from "./reports";
import lineworksRouter from "./lineworks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reportsRouter);
router.use(lineworksRouter);

export default router;
