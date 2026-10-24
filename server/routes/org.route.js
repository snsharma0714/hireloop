import express from "express"
import isAuth from "../middlewares/isAuth.js"
import requireOrg from "../middlewares/requireOrg.js"
import {
    acceptInvite, createInvite, getInvite, getMyOrg, getOverview, getTeam, myPendingInvites,
    removeMember, revokeInvite, updateMember, updateOrg
} from "../controllers/org.controller.js"
import { getEmailLog, getEmailSettings, sendTestEmail, updateEmailSettings } from "../controllers/email.controller.js"

const orgRouter = express.Router()

orgRouter.get("/", isAuth, requireOrg("viewer"), getMyOrg)
orgRouter.patch("/", isAuth, requireOrg("admin"), updateOrg)
orgRouter.get("/team", isAuth, requireOrg("viewer"), getTeam)
orgRouter.get("/overview", isAuth, requireOrg("viewer"), getOverview)
orgRouter.post("/invites", isAuth, requireOrg("admin"), createInvite)
orgRouter.get("/emails", isAuth, requireOrg("viewer"), getEmailSettings)
orgRouter.patch("/emails", isAuth, requireOrg("admin"), updateEmailSettings)
orgRouter.post("/emails/test", isAuth, requireOrg("admin"), sendTestEmail)
orgRouter.get("/emails/log", isAuth, requireOrg("recruiter"), getEmailLog)
orgRouter.delete("/invites/:id", isAuth, requireOrg("admin"), revokeInvite)
orgRouter.patch("/members/:userId", isAuth, requireOrg("admin"), updateMember)
orgRouter.delete("/members/:userId", isAuth, requireOrg("admin"), removeMember)

// invite links (the invitee isn't in a workspace yet)
orgRouter.get("/invites/pending", isAuth, myPendingInvites)
orgRouter.get("/invites/:token", getInvite)
orgRouter.post("/invites/:token/accept", isAuth, acceptInvite)

export default orgRouter
