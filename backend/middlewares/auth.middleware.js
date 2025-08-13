import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJwt = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(403, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_KEY);
        const user = await User.findById(decodedToken._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(403, "No Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(403, error?.message || "Invalid Access Token");
    }
});

const authorizeAdmin = (req, _, next) => {
    if (req.user?._id && req.user.isAdmin) {
        next();
    } else {
        throw new ApiError(401, "Not authorized as Admin");
    }
};

export { verifyJwt, authorizeAdmin };
