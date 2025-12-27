import prisma from '../config/db.config';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { setTokenCookie } from '../config/cookie';
import { generateOtp, sendOtp } from '../utils/otp';
const otpStore = new Map();
const JWT_SECRET = process.env.JWT_SECRET
declare global {
    namespace Express {
        interface Request {
            user?: User; // optional because not every request will have it
        }
    }
}
export const sendSignupOtp = async (req: Request, res: Response) => {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields required" })
    }

    try {
        // Check existing user
        const existingUser = await prisma?.user.findUnique({ where: { email } })
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" })
        }

        const otp = generateOtp()

        otpStore.set(email, {
            otp,
            userData: { name, email, password },
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 min
        })

        await sendOtp(email, otp)

        return res.json({ message: "OTP sent successfully" })

    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "OTP send error" })
    }
}
const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET!, { expiresIn: '1h' });
        const cook = await setTokenCookie(res, token);
        return res.status(200).json({ message: "Login successful", token });
    } catch (e) {
        console.error("Login error:", e);
        return res.status(500).json({ message: "Internal server error" });
    }
}
export { login };

const dummy = async (req: Request, res: Response) => {
    return res.status(200).json({ message: "Protected route accessed", user: req.user });
}
export { dummy };



export const verifySignupOtp = async (req: Request, res: Response) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    const record = otpStore.get(email);

    if (!record) {
        return res.status(400).json({ message: "OTP not found" });
    }

    const { otp: storedOtp, expiresAt, userData } = record;

    if (Date.now() > expiresAt) {
        otpStore.delete(email);
        return res.status(400).json({ message: "OTP expired" });
    }

    if (storedOtp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        const newUser = await prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: hashedPassword
            }
        });

        const token = jwt.sign(
            { userId: newUser.id, email: newUser.email },
            JWT_SECRET!,
            { expiresIn: '1h' }
        );

        setTokenCookie(res, token);

        otpStore.delete(email);

        return res.status(201).json({
            message: "User created successfully",
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name
            },
            token
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create user" });
    }
};

export const logout = async (req: Request, res: Response) => {
    res.clearCookie("jwt", {
        httpOnly: false,
        secure: true,
        sameSite: "none"
    });
    return res.status(200).json({ message: "Logout successful" });
}