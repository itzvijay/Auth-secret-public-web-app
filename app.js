//jshint esversion:6
require("dotenv").config();  //high security level 2 we just need to require it and then call config on it and we dont need to over again...
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy; //strategy for the google authantication 
const findOrCreate = require("mongoose-findorcreate"); //its for saving and finding and we are using for that to make our lives better



const app = express();
//console.log(process.env.API_KEY); its for the testing pourpose that works or not and we will ignore this file using .igignore to ignore this for security while uploading it to the real server...

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({ //initialize session and use that because we require it
secret:"this is vijays secret",
resave:false,
saveUninitialized:false
}));

app.use(passport.initialize());  //initialize passport
app.use(passport.session());  //for the passposrt dealing with the session


//mongoose Connection to the database
const connectionString = "mongodb://127.0.0.1:27017/userDB"; //userDB database Created
mongoose.connect(connectionString,{useNewUrlParser:true,useUnifiedTopology: true});

const db = mongoose.connection;
db.on("error",function(err){
    console.log(err);
});

db.once("open",function(){
    console.log("database connected succesfully");
});

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,  //using that we will no need to create a more users we just have the googleId for that 
    secret:String
});

userSchema.plugin(passportLocalMongoose); //adding plugin in our database
userSchema.plugin(findOrCreate); //addding plugin for findORCreate into our database

const User = mongoose.model("User",userSchema); // //user is the new collection

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id); //create the cockes
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  }); //blast the cockies

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:" https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) { //its save into our database and can find into our database
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/secrets",function(req,res){ //here the cockeis password is elabled then we will render the page if note then it will go to the login page...
    User.find({"secrets": {$ne:null}},function(err,foundUser){ //were find secrets not should be null then found the user 
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render("secrets",{userWithSecrets:foundUser}); //give the all all our secrets value to the userWithSecrets
            }
        }
    });
});


app.get("/submit",function(req,res){
    if(req.isAuthenticated){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
})

app.post("/submit",function(req,res){
    const SubmittedSecret = req.body.secret;

    console.log(req.user);
    User.findById(req.user.id,function(err,foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret = SubmittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
    });
    res.redirect("/");
});

//post requests for the register and login
//level 1 security

app.post("/register",function(req,res){ //below the all in the database doing by passposrt-local-mongoose so we write it as given in the npm documentation

    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login",function(req,res){
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });

    req.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.listen(3000,function(){
    console.log("the server is listening on port 3000");
});