import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mathRouter from "./math";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mathRouter);

export default router;
