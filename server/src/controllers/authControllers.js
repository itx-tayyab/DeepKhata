import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'; 
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const registeruser = async(req,res) => {
    const {name, email, password} = req.body;

    try {
        const existinguser = await prisma.user.findUnique({
            where: {
                email: email,
            }
        });
        if(existinguser){
            return res.status(400).json({message: "Email Already Exist"})
        }

        const hashPassword = await bcrypt.hash(password,10);

        const NewUser = await prisma.user.create({
            data: {
                name: name,
                email: email,
                password: hashPassword,
            }
        })

        res.status(201).json({
            user: NewUser
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
}

export const loginuser = async(req,res) => {
    const {email,password} = req.body;

    try {
        const existinguser = await prisma.user.findUnique({
            where: {
                email: email,
            }
        });
        if(!existinguser){
            return res.status(400).json({message: "Email Not Found"})
        }

        const isFound = await bcrypt.compare(password, existinguser.password);
        if(!isFound){
            return res.status(401).json({message: "Invalid Password"})
        }

        const accesstoken = jwt.sign
        (
            {
             id: existinguser.id,
             role: existinguser.role,
             businessId: existinguser.businessId,
            },
            process.env.ACCESS_TOKEN_SECRET,
            {
                expiresIn: process.env.ACCESS_TOKEN_EXPIRATION
            }
        )

        const refreshtoken = jwt.sign
        (
            {
             id: existinguser.id,
            },
            process.env.REFRESH_TOKEN_SECRET,
            {
                expiresIn: process.env.REFRESH_TOKEN_EXPIRATION
            }
        )

        res.cookie(
        "jwt", refreshtoken, 
        {
        httpOnly: true,   
        secure: true,     
        }
       );

       res.json({
       message: "Login successful",
       accessToken: accesstoken,
       user: existinguser,
    });
        
    } catch (err) {
        res.status(500).json({message: "Server error"});
    }
}

export const logoutuser = async(req,res) => {
    res.clearCookie("jwt");
    res.json({message: "Logout successful"});
}