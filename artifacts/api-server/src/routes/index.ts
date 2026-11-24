import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mathRouter from "./math";
import authRouter from "./auth";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mathRouter);
router.use(authRouter);
router.use(storageRouter);

export default router;
