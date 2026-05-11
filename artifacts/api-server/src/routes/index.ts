import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playersRouter from "./players";
import teamsRouter from "./teams";
import turfsRouter from "./turfs";
import bookingsRouter from "./bookings";
import paymentsRouter from "./payments";
import matchesRouter from "./matches";
import statsRouter from "./stats";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(playersRouter);
router.use(teamsRouter);
router.use(turfsRouter);
router.use(bookingsRouter);
router.use(paymentsRouter);
router.use(matchesRouter);
router.use(statsRouter);
router.use(notificationsRouter);
router.use(adminRouter);

export default router;
