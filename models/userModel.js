const { Type } = require("lucide-react");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/miniproject");

const userSchema = mongoose.Schema({
    username : String,
    name : String,
    age : Number,
    email : String,
    password : String,
    posts :[
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "post"
        }

    ],
    pic : {
        type : String,
        default : "/images/uploads/default-profile.jpg"
    }
})

module.exports = mongoose.model("user",userSchema);