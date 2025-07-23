const express = require("express");
const userModel = require("./models/userModel");
const postModel = require("./models/postModel");
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const upload = require("./config/multerconfig");
const { title } = require("process");
const { text } = require("stream/consumers");


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

app.post("/register", upload.single("pic"), async function(req, res) {
  try {
    const already = await userModel.findOne({ email: req.body.email });
    if (already) return res.redirect("/login");

    bcrypt.hash(req.body.password, 10, async function(err, hashedPassword) {
      const user = await userModel.create({
        username: req.body.username,
        name: req.body.name,
        age: req.body.age,
        email: req.body.email,
        password: hashedPassword,
        pic: req.file ? "/images/uploads/" + req.file.filename : "/images/default.jpg" // <- FIXED
      });

      const token = jwt.sign({ email: user.email, userid: user._id }, "shh");
      res.cookie("token", token);

      const Transport = nodemailer.createTransport({
        service : "gmail",
        auth :{
            user : "shantanuubhe9@gmail.com",
            pass : "okvwyvaisdohmlck"
        }
        })
        const mail = {
            from : "shantanuubhe9@gmail.com",
            to : req.body.email,
            subject : "Welcome To Posts - app",
            text : `Hi ${user.name},\n\nThanks for registering on our Posts App. We're happy to have you!\n\nRegards,\nTeam Posts App`,
        }
      
        await Transport.sendMail(mail);

      res.redirect("/dashboard");
    });

  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).send("Something went wrong.");
  }
});

app.post("/set", async function(req, res) {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            console.log("User not found");
            return res.redirect("/login"); // better UX
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.log("Incorrect password");
            return res.redirect("/login");
        }

        const token = jwt.sign({ email: user.email, userid: user._id }, "shh");
        res.cookie("token", token);
        res.redirect("/dashboard");

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).send("Internal Server Error");
    }
});


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

app.get("/updateprof/:email",isLoggedIn, async function(req,res){
    let user = await userModel.findOne({email : req.params.email})


    res.render("update",{user : user});
})

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

app.post("/updateuser/:email", upload.single("pic"), async function(req, res) {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const updateData = {
            username: req.body.username,
            name: req.body.name,
            age: req.body.age,
            email: req.body.email,
            password: hashedPassword
        };

        if (req.file) {
            updateData.pic = "/images/uploads/" + req.file.filename;
        }

        await userModel.findOneAndUpdate(
            { email: req.params.email },
            updateData,
            { new: true }
        );

        res.redirect("/profile");
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).send("Something went wrong");
    }
});


app.listen(3000,function(req,res){
    console.log("Running");
});