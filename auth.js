import { compare, hash } from "bcryptjs";
import { User } from "./models.js";

export async function getUserByToken(token) {
    if (!token) {
        return null;
    }

    const user = await User.findOne({ token }).exec();

    if (user && user.tokenExpiry > Date.now()) {
        return user;
    }

    return null;
}

export function authRoutes(app) {
    app.get("/api/status", async (req, res) => {
        const user = await getUserByToken(req.session?.token);

        if (user) {
            res.json({
                success: true,
                loggedIn: true,
                user: user.username
            })
        } else {
            res.json({
                success: true,
                loggedIn: false,
                user: null
            })
        }
    })

    app.post("/api/sign-up", async (req, res) => {
        const user = await getUserByToken(req.session?.token);

        if (user) {
            res.status(400).json({
                success: false,
                error: "Cannot sign up while already signed in"
            })
            return;
        }

        if (req.body.password && typeof req.body.password === "string" && !/^[\x20-\x7e]{1,100}$/.test(req.body.password)) {
            res.status(400).json({
                success: false,
                error: "Invalid username or password"
            })
            return;
        }
      
        const newUser = new User({
            username: req.body.username,
            password: await hash(req.body.password, 10),
            token: (Math.random()).toString(36).slice(2),
            tokenExpiry: Date.now() + 86400000
        });

        try {
            await newUser.validate()
        } catch {
            res.status(400).json({
                success: false,
                error: "Invalid username or password"
            })
            return;
        }

        if (!req.body.password2 || req.body.password2 !== req.body.password) {
            res.status(400).json({
                success: false,
                error: "Passwords do not match"
            })
            return;
        }

        if (await User.findOne({ username: req.body.username }).exec()) {
            res.status(400).json({
                success: false,
                error: "A user already exists with that username"
            })
            return;
        }


        await newUser.save();

        req.session.token = newUser.token;

        res.status(200).json({
            success: true,
            token: newUser.token
        })
    })

    app.post("/api/sign-in", async (req, res) => {
        const signedInUser = await getUserByToken(req.session?.token);

        if (signedInUser) {
            res.status(400).json({
                success: false,
                error: "Cannot sign in while already signed in"
            })
            return;
        }

        const signingInUser = await User.findOne({ username: req.body?.username, ghId: null }).exec();

        if (!signingInUser) {
            res.status(404).json({
                success: false,
                error: "No user found with the specified username"
            })
            return;
        }

        if (!(await compare(req.body.password, signingInUser.password))) {
            res.status(401).json({
                success: false,
                error: "Incorrect password"
            })
            return;
        }

        signingInUser.token = (Math.random()).toString(36).slice(2);
        signingInUser.tokenExpiry = Date.now() + 86400000;
        await signingInUser.save();
        req.session.token = signingInUser.token;

        res.status(200).json({
            success: true,
            token: signingInUser.token
        })
    })

    app.post("/api/sign-out", async (req, res) => {
        const user = await getUserByToken(req.session?.token);

        if (user) {
            user.tokenExpiry = 0;
            await user.save();
            req.session.token = null;
            res.status(200).json({
                success: true
            })
        } else {
            res.status(401).json({
                error: "Not signed in"
            })
        }
    })

    app.get("/api/gh-authorize", async (req, res) => {
        const user = await getUserByToken(req.session?.token);

        if (user) {
            res.redirect("/");
            return;
        }

        const authData = await fetch("https://github.com/login/oauth/access_token?client_id=" + process.env.GH_CLIENT_ID + "&client_secret=" + process.env.GH_CLIENT_SECRET + "&code=" + req?.query?.code, {
            method: "POST",
            headers: {
                "Accept": "application/json"
            }
        }).then(r => r.json());

        const userData = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": "Bearer " + authData["access_token"]
            }
        }).then(r => r.json());

        if (userData.login && userData.id) {
            const signingInUser = await User.findOne({ ghId: userData.id }).exec();

            if (signingInUser) {
                signingInUser.token = (Math.random()).toString(36).slice(2);
                signingInUser.tokenExpiry = Date.now() + 86400000;
                await signingInUser.save();
                req.session.token = signingInUser.token;
            } else {
                const newUser = new User({
                    username: userData.login,
                    ghId: userData.id,
                    token: (Math.random()).toString(36).slice(2),
                    tokenExpiry: Date.now() + 86400000
                });
                
                try {
                    await newUser.validate()
                } catch {
                    res.redirect("/");
                    return;
                }

                await newUser.save();
                req.session.token = newUser.token;
            }
        }

        res.redirect("/");
        return;
    })
}