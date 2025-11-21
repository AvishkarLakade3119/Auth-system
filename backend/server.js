import express from "express";
import {createServer} from "node:http";
import mongoose from "mongoose";
import "dotenv/config"
import cors from "cors";
import session from "express-session";
import passport from "./config/passport.js";
import morgan from "morgan";
import logger from "./utils/logger.js";

const app = express();
const server = createServer(app);

app.set("port", (process.env.PORT || 5000));

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',  // Main frontend
    'http://localhost:3000',  // Alternative frontend port
    'http://localhost:3001',  // Admin UI
    'http://127.0.0.1:3001',  // Admin UI localhost IP
    'http://192.168.0.11:3001',  // Admin UI network IP
    'http://172.27.224.1:3001'   // Admin UI network IP
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
    exposedHeaders: ['Content-Length', 'X-Request-Id']
}));

// Body parsing middleware
app.use(express.json({limit : "40kb"}));
app.use(express.urlencoded({limit : "40kb", extended : true}));

// Session middleware (required for passport)
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Morgan HTTP request logger
app.use(morgan('combined', { stream: logger.stream }));


// mongo connect
const db_url = process.env.MONGODB_URI || "mongodb://admin:password@localhost:27017/User_auth?authSource=admin";


main()
    .then(
        console.log("successfull")
    )
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(db_url);
}





// routes acess for the server


// user auth routes
import userRouter from "./routes/userRoutes.js";
app.use("/api/auth", userRouter);


// user profile routes
import userProfileRouter from "./routes/profileRoutes.js";
app.use("/api/profile", userProfileRouter);

// admin routes
import adminRouter from "./routes/adminRoutes.js";
app.use("/api/admin", adminRouter);




// home route

app.get("/", async (req,res) => {
    let obj = {
        msg : "hello from express backend",
    }
    return res.send(obj);
})


// starting the server using a function start() and then calling it later

const start = async () => {
    const port = app.get("port");
    server.listen(port, () => {
        console.log(`Backend server ready on port ${port}`);
        console.log(`API available at http://localhost:${port}/api`);
    })
}

start();