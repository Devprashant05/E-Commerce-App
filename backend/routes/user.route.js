import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getAllUsers,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    deleteUserByID,
    getUserById,
    updateUserById
} from "../controllers/user.controller.js";
import { verifyJwt, authorizeAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router
    .route("/")
    .post(registerUser)
    .get(verifyJwt, authorizeAdmin, getAllUsers);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJwt, logoutUser);
router
    .route("/profile")
    .get(verifyJwt, getCurrentUserProfile)
    .patch(verifyJwt, updateCurrentUserProfile);

// Admin Routes
router
    .route("/:id")
    .delete(verifyJwt, authorizeAdmin, deleteUserByID)
    .get(verifyJwt, authorizeAdmin, getUserById)
    .patch(verifyJwt, authorizeAdmin, updateUserById);

export default router;
