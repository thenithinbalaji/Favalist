const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const path = require('path');
const request = require('request')
const querystring = require('querystring');
const axios = require('axios');
const { error } = require("console");
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));

// setting public folder as static folder for static files
app.use(express.static(path.join(__dirname, '/public')));

// setting view engine as ejs
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: true,
    resave: true
}))

app.listen(3000, () => {
    console.log("Server is running");
});

// all the routes
app.get("/", (req, res) => {
    if (req.session.user == null) {
        res.render("favalist");
    }
    else {
        db.collection("users").findOne({ "username": req.session.user.username }, (err, result) => {
            req.session.user = result;
        });


        console.log(req.session.user.smashlist);
        console.log([...req.session.user.smashlist, req.session.user.username]);
        // fetch a random user from db whose username is not equal to req.session.user 
        db.collection("users").findOne({ "username": { $nin: [...req.session.user.smashlist, req.session.user.username] } }, (err, result) => {
            data = result;
            console.log(data);
            res.render("home", { data });

        });
    }
});


app.get("/profile/:str", (req, res) => {
    db.collection("users").findOne({ "username": req.params.str }, (err, result) => {
        if (result == null) {
            res.render("noprofile");
        }
        else {
            data = result;
            res.render("profile", { data });
        }
    });
});


app.get("/login", (req, res) => {
    if (req.session.user == null) {
        res.render("login", { error: "" });
    }
    else {
        res.redirect("/");
    }
});

app.post("/login", (req, res) => {
    console.log(req.body);
    db.collection("users").findOne({ "email": req.body.email, "password": req.body.password }, (err, result) => {
        console.log(result);

        if (result == null) {
            res.render("login", { error: "Invalid email or password" });
        }
        else {
            req.session.user = result;
            res.redirect("/");
        }
    });

});

app.get("/signup", (req, res) => {
    if (req.session.user == null) {
        res.render("signup", { error: "" });
    }
    else {
        res.redirect("/");
    }
});

app.post("/signup", (req, res) => {
    console.log(req.body);
    topArtists = req.body.topArtists == "" ? [] : JSON.parse(req.body.topArtists);
    topTracks = req.body.topTracks == "" ? [] : JSON.parse(req.body.topTracks);

    //check if username or email already exists
    db.collection("users").findOne({ $or: [{ "username": req.body.username }, { "email": req.body.email }] }, (err, result) => {
        console.log(result);

        if (result == null) {
            db.collection("users").insertOne({
                username: req.body.username.trim(),
                email: req.body.email,
                gender: req.body.gender,
                color: req.body.color,
                flower: req.body.flower,
                food: req.body.food,
                animal: req.body.animal,
                password: req.body.password,
                topArtists: topArtists,
                topTracks: topTracks,
                likelist: [],
                smashlist: []
            });

            res.redirect("login");
        }
        else {
            console.log("Username or email already exists");
            res.render("signup", { error: "Username or email already exists" });
        }
    });
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.use((req, res, next) => {
    if (req.session.user == null) {
        res.redirect("/login");
    }
    else {
        next();
    }
});

app.get("/like/:str", (req, res) => {

    db.collection("users").findOne({ "username": req.params.str }, (err, result) => {
        if (result == null) {
            res.redirect("/")
        }
        else {
            user = req.params.str;
            db.collection("users").updateOne({ "username": req.session.user.username }, { "$addToSet": { "smashlist": user } });
            db.collection("users").updateOne({ "username": user }, { "$addToSet": { "likelist": req.session.user.username } });
        }
    });

    res.redirect("/")
});

app.get("/unlike/:str", (req, res) => {


    db.collection("users").findOne({ "username": req.params.str }, (err, result) => {
        if (result == null) {
            res.redirect("/")
        }
        else {
            user = req.params.str;
            db.collection("users").updateOne({ "username": req.session.user.username }, { "$pull": { "smashlist": user } });
            db.collection("users").updateOne({ "username": user }, { "$pull": { "likelist": req.session.user.username } });
        }

    });

    res.redirect("/")
});

app.get("/likes", (req, res) => {
    res.render("likes");
});

app.get("/likesjson", (req, res) => {
    db.collection("users").findOne({ "username": req.session.user.username }, (err, result) => {
        res.json(result.likelist);
    });
});

app.get("/smashlist", (req, res) => {
    res.render("smashlist");
});

app.get("/smashlistjson", (req, res) => {
    db.collection("users").findOne({ "username": req.session.user.username }, (err, result) => {
        res.json(result.smashlist);
    });
});

app.get('*', (req, res) => {
    res.redirect('/');
});