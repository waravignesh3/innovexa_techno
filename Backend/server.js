import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import user from "./models/user.js";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
    res.send("server is running");
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const find = await user.findOne({
        username: username,
        password: password
    });
    if (find && password === find.password) {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.json({ success: false, message: "Invalid credentials" });
    }
});

app.post("/signin", async (req, res) => {
    const { username, password } = req.body;
    try {
        const newUser = new user({ username, password });
        await newUser.save();
        res.json({ success: true, message: "User registered successfully" });
    } catch (err) {
        if (err.code === 11000) {
            res.json({ success: false, message: "Username already exists" });
        } else {
            res.json({ success: false, message: "Error registering user" });
        }
    }
});

mongoose.connect("mongodb://localhost:27017/userdata", {
}).then(() => {
    console.log("Connected to MongoDB");
}).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});



app.listen(3000, () => {
    console.log("Server is running on port 3000");
});