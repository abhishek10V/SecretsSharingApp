//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//const md5 = require("md5");
// const bcrypt = require("bcrypt");
// const saltrounds = 10;

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret : "This is my Secret.",
  resave : false,
  saveUninitialized : false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/secretsDB" , {useNewUrlParser : true});

const UserSchema = new mongoose.Schema({
  email : String,
  password : String,
  googleId : String,
  secret : String
});

//const secrets = process.env.SECRETS;

//UserSchema.plugin(encypt , {secret: process.env.SECRETS , encryptedFields: ["password"]});

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);


const User = new mongoose.model("User" , UserSchema);

passport.use(User.createStrategy());
passport.serializeUser((user,done)=>{
  //user.id is not profile id. it is id that created by the database
      done(null,user.id)
  })
  passport.deserializeUser((id,done)=>{
    User.findById(id).then((user)=>{
        done(null,user)
    })
})

passport.use(new GoogleStrategy({
  clientID:     process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://localhost:3000/auth/google/secrets",
  passReqToCallback   : true
},
function(request, accessToken, refreshToken, profile, done) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return done(err, user);
  });
}
));

app.get("/" , function(req , res){
    res.render("home");
});

app.get("/login" , function(req , res){
    res.render("login");
});

app.get("/register" , function(req , res){
    res.render("register");
});

app.get("/secrets" , function(req , res){
  if(req.isAuthenticated()){
    res.render("secrets");
  } else{
    res.redirect("/login");
  }
});

app.get("/logout" , function(req , res){
  req.logOut(function(err){
    if(err){
      console.log(err);
    } else{
      res.redirect("/");
    }
  });
 
});

app.get("/auth/google" ,
  passport.authenticate("google" , {scope : ["profile"]})
);

app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));

app.post("/register" , function(req , res){

  //  bcrypt.hash(req.body.password , saltrounds).then(function(hash){
  //   const newUser = new User({
  //     email : req.body.username,
  //     password: hash
  //   });
  
  //   newUser.save().then(() => res.render("secrets")).catch((err) => res.send(err));
  
  //  })

  User.register({username : req.body.username} , req.body.password , function(err , user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else{
      passport.authenticate("local")(req , res , function(){
        res.redirect("/secrets");
      })
    }
  })

 });

app.post("/login" ,function(req , res){
//   const username = req.body.email;
//   const password = req.body.password;
// User.findOne({email : username}).then(function(foundUser){
//   if(foundUser){
//     bcrypt.compare(password , foundUser.password ,function(err , result){
      
//         if(result === true){
//           res.render("secrets");
//         }  else{
//            res.send("Incorrect Password");
//          }
//    });
//     } else{
//     res.send("User not found");
//   }
    
// });

const user = new User({
  username : req.body.username,
  password : req.body.password
});
 
 req.login(user , function(err){
  if(err){
    console.log(err);
  } else{
    passport.authenticate("local")(req , res , function(){
      res.redirect("/secrets");
  })
}
 })
});

app.get("/submit" , function(req , res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
   
});

app.post("/submit" , function(req , res){
  const submittedSecret = req.body.secret;

  console.log(req.user._id);

  User.findById(req.user._id).then( function(err , foundUser){
    if(err){
      console.log(err);
     } else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save().then(function(){
          res.redirect("/secrets");
        }).catch(err => console.log(err));
       
      }
     }
  }); 
     
  });


app.listen(3000, function() {
  console.log("Server started on port 3000");
});

