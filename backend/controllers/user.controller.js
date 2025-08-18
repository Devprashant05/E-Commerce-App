import { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const options = {
    httpOnly: true,
    secure: true,
};

const generateTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Error while generating Access and Refresh Tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { username, fullname, email, password } = req.body;

    // if (
    //     [username, fullname, email, password].some(
    //         (field) => field?.trim() === ""
    //     )
    // ) {
    //     // throw new ApiError(400, "Please fill all the fields");
    // }
    if (!username || !fullname || !email || !password) {
        throw new ApiError(400, "Please fill all the fields");
    }

    const existedUser = await User.findOne({
        email,
    });

    if (existedUser) {
        throw new ApiError(400, "User already exists. Please Login!");
    }

    const user = await User.create({
        username,
        fullname,
        email,
        password,
    });

    const createdUserId = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUserId) {
        throw new ApiError(500, "Something went wrong while register user");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, createdUserId, "User Registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!(username || email) || !password) {
        throw new ApiError(400, "Email or Username and Password are required");
    }

    const existedUser = await User.findOne({
        email,
    });

    if (!existedUser) {
        throw new ApiError(400, "User not found. Please create a account!");
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(400, "Password is incorrect!");
    }

    const { accessToken, refreshToken } = await generateTokens(existedUser._id);

    const loggedInUser = await User.findById(existedUser._id).select(
        "-refreshToken -password"
    );

    if (!loggedInUser) {
        throw new ApiError(500, "Error while login!");
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User Logged In successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({});
    if (!users) {
        throw new ApiError(401, "No users found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, users, "All Users fetched successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id).select(
        "-password -refreshToken"
    );
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Current User Details fetched successfully"
            )
        );
});

const updateCurrentUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (user) {
        user.username = req.body.username || user.username;
        user.fullname = req.body.fullname || user.fullname;
        user.email = req.body.email || user.email;

        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUserProfile = await user.save({
            validateModifiedOnly: true,
        });

        if (!updatedUserProfile) {
            throw new ApiError(
                500,
                "Something went wrong while updatin profile"
            );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedUserProfile,
                    "User Profle is updated"
                )
            );
    } else {
        throw new ApiError(404, "User not found");
    }
});

const deleteUserByID = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log(id);

    if (!isValidObjectId(id)) {
        throw new ApiError(404, "Invalid id! Please try again");
    }

    const user = await User.findById(id);

    if (user) {
        if (user.isAdmin) {
            throw new ApiError(400, "Cannot delete the admin user");
        }

        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            throw new ApiError(500, "something went wrong while deleting user");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(200, deletedUser, "Successfully Deleted User")
            );
    } else {
        throw new ApiError(404, "User not found");
    }
});

const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(404, "Invalid Id! Please try again");
    }

    const userInfo = await User.findById(id).select("-password -refreshToken");

    if (!userInfo) {
        throw new ApiError(404, "User not found");
    } else {
        return res
            .status(200)
            .json(
                new ApiResponse(200, userInfo, "User info fetched successfully")
            );
    }
});

const updateUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(404, "Invalid Id! Please try again");
    }

    const user = await User.findById(id);

    if (user) {
        user.username = req.body.username || user.username;
        user.fullname = req.body.fullname || user.fullname;
        user.email = req.body.email || user.email;
        user.isAdmin = Boolean(req.body.isAdmin);

        const updatedUser = await user.save();

        if (!updatedUser) {
            throw new ApiError(500, "something went wrong while updating user");
        }

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    _id: updatedUser._id,
                    username: updatedUser.username,
                    fullname: updatedUser.fullname,
                    email: updatedUser.email,
                    isAdmin: updatedUser.isAdmin,
                },
                "User details updated successfully"
            )
        );
    } else {
        throw new ApiError(404, "User not found");
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    getAllUsers,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    deleteUserByID,
    getUserById,
    updateUserById,
};
