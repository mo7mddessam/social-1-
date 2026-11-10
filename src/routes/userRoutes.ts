import { Router } from "express";
import { Op } from "sequelize";
import { User } from "../models/User";
import { Follow } from "../models/Follow";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/me", async (req: AuthRequest, res, next) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) { res.status(404).json({ message: "User not found." }); return; }
    res.json({ user });
  } catch (error) { next(error); }
});

router.patch("/me", async (req: AuthRequest, res, next) => {
  try {
    const { name, bio } = req.body ?? {};
    if (name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.length > 80)) {
      res.status(400).json({ message: "Name must be between 2 and 80 characters." }); return;
    }
    if (bio !== undefined && (typeof bio !== "string" || bio.length > 300)) {
      res.status(400).json({ message: "Bio must be 300 characters or fewer." }); return;
    }
    const user = await User.findByPk(req.userId);
    if (!user) { res.status(404).json({ message: "User not found." }); return; }
    await user.update({
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(bio !== undefined ? { bio } : {})
    });
    res.json({ user });
  } catch (error) { next(error); }
});

router.patch("/me/privacy", async (req: AuthRequest, res, next) => {
  try {
    const { isPrivate } = req.body ?? {};
    if (typeof isPrivate !== "boolean") {
      res.status(400).json({ message: "isPrivate must be true or false." }); return;
    }
    const user = await User.findByPk(req.userId);
    if (!user) { res.status(404).json({ message: "User not found." }); return; }
    await user.update({ isPrivate });
    res.json({ message: `Profile is now ${isPrivate ? "private" : "public"}.`, isPrivate });
  } catch (error) { next(error); }
});

router.post("/:id/follow", async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0 || targetId === req.userId) {
      res.status(400).json({ message: "Invalid target user." }); return;
    }
    const target = await User.findByPk(targetId);
    if (!target) { res.status(404).json({ message: "User not found." }); return; }
    await Follow.findOrCreate({ where: { followerId: req.userId!, followingId: targetId } });
    res.status(200).json({ message: target.isPrivate ? "Follow request placeholder: private-account approval is not implemented yet." : "User followed." });
  } catch (error) { next(error); }
});

router.delete("/:id/follow", async (req: AuthRequest, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0 || targetId === req.userId) {
      res.status(400).json({ message: "Invalid target user." }); return;
    }
    await Follow.destroy({ where: { followerId: req.userId, followingId: targetId } });
    res.json({ message: "User unfollowed." });
  } catch (error) { next(error); }
});

router.get("/search", async (req: AuthRequest, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) { res.status(400).json({ message: "Search query must be at least 2 characters." }); return; }
    const users = await User.findAll({
      where: { id: { [Op.ne]: req.userId }, name: { [Op.like]: `%${q}%` }, isPrivate: false },
      limit: 20,
      attributes: ["id", "name", "bio", "isPrivate"]
    });
    res.json({ users });
  } catch (error) { next(error); }
});

router.get("/suggestions", async (req: AuthRequest, res, next) => {
  try {
    const following = await Follow.findAll({ where: { followerId: req.userId }, attributes: ["followingId"] });
    const excluded = [req.userId!, ...following.map((f) => f.followingId)];
    const users = await User.findAll({
      where: { id: { [Op.notIn]: excluded }, isPrivate: false },
      limit: 10,
      attributes: ["id", "name", "bio"]
    });
    res.json({ users });
  } catch (error) { next(error); }
});

export default router;
