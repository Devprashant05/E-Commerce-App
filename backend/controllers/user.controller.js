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

export { registerUser, loginUser, logoutUser };
