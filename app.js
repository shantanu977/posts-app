const express = require("express");
const userModel = require("./models/userModel");
const postModel = require("./models/postModel");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");


const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());
app.set("view engine","ejs");

app.get("/",function(req,res){
    res.render("index");
})

app.get("/login",function(req,res){
    res.render("login");
})

app.post("/register",async function(req,res){

    let already = await userModel.findOne({email : req.body.email});
    if(already) 
    {    
        res.redirect("/login");
    }
    else {
    bcrypt.hash(req.body.password,10,async function(err,result){
        let user = await userModel.create({
        username : req.body.username,
        name : req.body.name,
        age : req.body.age,
        email : req.body.email,
        password : result
    })
    let Token = jwt.sign({email : user.email , userid : user._id},"shh");
    res.cookie("token",Token);

    const transporter = nodemailer.createTransport({
        service : "gmail",
        auth :
        {
            user : "shantanuubhe9@gmail.com",
            pass : "okvwyvaisdohmlck"
        }
    })

    const mail ={
        from : "shantanuubhe9@gmail.com",
        to : user.email,
        subject : "Welcome To Posts App",
        text : `Hello ${user.name},\n\nWelcome to Posts App! We're glad to have you on board.\n\nStart posting and enjoy the experience.\n\n- Team Posts App`
    }

    await transporter.sendMail(mail);
    res.redirect("/dashboard");
    })   
}
})

app.post("/set",async function(req,res){
    let {email,password} = req.body;

    let user = await userModel.findOne({email : email});

    if(!user){
        return res.redirect("/");
    }

    bcrypt.compare(password,user.password,function(err,result){
        
        if(result){
            let Token = jwt.sign({email : user.email , userid : user._id},"shh");
            res.cookie("token",Token);
            res.redirect("/dashboard");
        }
        else{
            res.redirect("/login");
        }
    })
    
})

app.get("/logout",function(req,res){
    res.clearCookie("token");
    res.redirect("/login");
})

function isLoggedIn(req,res,next){
    const token = req.cookies.token;

    if(!token){
        res.redirect("/");
    }
    else
    {
        jwt.verify(token,"shh",function(err,decoded){
            req.user = decoded;
            next();
        })
    }
}

app.get("/dashboard", isLoggedIn, async function(req, res) {

    const posts = await postModel.find().populate("user");
    res.render("dashboard",{posts , currentUserId : req.user.userid})
})

app.get("/profile",isLoggedIn,async function(req,res){
    let user = await userModel.findById(req.user.userid);
    let posts = await postModel.find({ user: user._id })
    res.render("profile",{user : user,posts : posts});
});

app.post("/createpost", isLoggedIn,async function(req,res){
    let user = await userModel.findById(req.user.userid);

    let post = await postModel.create({
        content: req.body.content,
        user: req.user.userid,
       // Date: new Date()
    })

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.get("/like/:postid", isLoggedIn, async function(req, res) {
    const post = await postModel.findById(req.params.postid);

    const index = post.likes.indexOf(req.user.userid);
    if (index === -1) {
        post.likes.push(req.user.userid); // add like
    } else {
        post.likes.splice(index, 1); // remove like
    }

    await post.save();
    res.redirect("/dashboard");
});

app.get("/delete/:postid", isLoggedIn, async function(req, res) {
    const post = await postModel.findById(req.params.postid);
    
    if (post && post.user.toString() === req.user.userid) {
        await postModel.findByIdAndDelete(req.params.postid);
    }
    await userModel.findByIdAndUpdate(req.user.userid, {
    $pull: { posts: req.params.postid }
    });
    res.redirect("/profile");
});

app.get("/edit/:postid",isLoggedIn,async function (req,res) {
    const post = await postModel.findById(req.params.postid);

    res.render("edit",{post : post});
})

app.post("/editpost",isLoggedIn,async function(req,res) {
    const post = await postModel.findById(req.body.postid);

    if(post && post.user.toString()==req.user.userid)
    {
        post.content=req.body.content;
        await post.save();
    }
    res.redirect("/profile");
})

app.listen(3000,function(req,res){
    console.log("Running");
});