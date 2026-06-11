import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reportsRouter from "./reports";
import lineworksRouter from "./lineworks";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(reportsRouter);
router.use(lineworksRouter);
router.use(settingsRouter);

export default router;
