import mongoose from "mongoose";
import dns from "dns";

// This machine's default DNS resolver (127.0.0.1) refuses Node's SRV/TXT
// lookups, which mongodb+srv:// connection strings require. Point Node's
// resolver at public DNS servers so Atlas's SRV record resolves.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("DataBase Connected")
    } catch (error) {
        console.log(`DataBase Error ${error}`)
    }
}

export default connectDb