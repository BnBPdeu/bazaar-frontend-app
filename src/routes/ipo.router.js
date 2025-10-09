import Router from 'express';
import { allocateIPO, applyIPO, closeIPO, createIPO, getAllIPOs, getUserAllocatedIPOs, startIPO } from '../controllers/ipo.controllers.js';
import { AdminVerify, authVerify } from '../middlewares/auth.middlewares.js';

export const ipoRouter = Router()

// for admin side 
ipoRouter.route("/createipo").post(createIPO);
ipoRouter.route("/startipo/:id").put(AdminVerify,startIPO);
ipoRouter.route("/closeipo/:id").put(AdminVerify,closeIPO);
ipoRouter.route("/allocateipo/:id").put(AdminVerify,allocateIPO);


// for user  side
ipoRouter.route("/applyipo/:id").post(applyIPO);
ipoRouter.route("/getallipo").get(getAllIPOs);
ipoRouter.route("/getAllocatedUser/:userId").get(getUserAllocatedIPOs);
