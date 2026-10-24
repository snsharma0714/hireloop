import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    credits:{
        type:Number,
        default:100
    },
    // Chosen once after the first login. null = hasn't picked yet (shown the role picker).
    role:{
        type:String,
        enum:["student", "company", null],
        default:null
    },
    // student profile
    headline:{ type:String, default:"" },
    college:{ type:String, default:"" },
    graduationYear:{ type:Number },
    skills:{ type:[String], default:[] },
    resumeUrl:{ type:String, default:"" },
    // company accounts belong to a workspace, with an access level inside it
    org:{ type:mongoose.Schema.Types.ObjectId, ref:"Organization", default:null },
    orgRole:{ type:String, enum:["admin", "recruiter", "viewer", null], default:null },
    // legacy company profile (now stored on the Organization)
    companyName:{ type:String, default:"" },
    companyWebsite:{ type:String, default:"" },
    companyAbout:{ type:String, default:"" }

}, {timestamps:true})

const User = mongoose.model("User" , userSchema)

export default User
