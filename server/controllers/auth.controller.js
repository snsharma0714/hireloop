import genToken from "../config/token.js"
import User from "../models/user.model.js"
import { AuthTokenError, verifyFirebaseToken } from "../services/firebaseAuth.service.js"


export const googleAuth = async (req,res) => {
    try {
        // who is signing in comes from Google's signed token, never from the request body
        const {name , email} = await verifyFirebaseToken(req.body.idToken)
        let user = await User.findOne({email})
        if(!user){
            user = await User.create({
                name , 
                email
            })
        }
        let token = await genToken(user._id)
        res.cookie("token" , token , {
            httpOnly:true,
            secure:process.env.NODE_ENV === "production",
            sameSite:"strict",
            maxAge:7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json(user)



    } catch (error) {
        if (error instanceof AuthTokenError) return res.status(401).json({message: error.message})
        return res.status(500).json({message:`Google auth error ${error}`})
    }
    
}

export const logOut = async (req,res) => {
    try {
        await res.clearCookie("token")
        return res.status(200).json({message:"LogOut Successfully"})
    } catch (error) {
         return res.status(500).json({message:`Logout error ${error}`})
    }
    
}