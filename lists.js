import { List, Vote } from "./models.js";
import { getUserByToken } from "./auth.js";

export function listRoutes(app) {
    app.post("/api/list", async (req, res) => {
        const user = await getUserByToken(req.session?.token);

        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to create a list"
            })
            return;
        }

        const newList = new List({
            title: req.body.title,
            options: Array.from(new Set(req.body.options)),
            creator: user._id
        })

        try {
            await newList.validate()
        } catch {
            res.status(400).json({
                success: false,
                error: "Invalid list"
            })
            return;
        }

        await newList.save();

        res.status(200).json({
            success: true,
            id: newList._id
        })
    })

    app.delete("/api/list/:list", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }

        const user = await getUserByToken(req.session?.token);

        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to delete a list"
            })
            return;
        }

        const list = await List.findOneAndDelete({
            _id: req.params.list,
            creator: user._id
        }).exec()

        await Vote.deleteMany({
            list: req.params.list
        })

        if (list) {
            res.status(200).json({
                success: true
            })
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to delete list"
            })
        }
    })

    app.put("/api/list/:list", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }

        const user = await getUserByToken(req.session?.token);
        
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to edit a list"
            })
            return;
        }

        var list;
        try {
            list = await List.findOneAndUpdate({
                _id: req.params.list,
                creator: user._id
            }, {
                title: req.body.title,
                options: Array.from(new Set(req.body.options)),
                creator: user._id
            }, {
                runValidators: true
            }).exec()
        } catch {
            res.status(400).json({
                success: false,
                error: "Invalid list"
            })
            return;
        }

        if (list) {
            res.status(200).json({
                success: true
            })
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to edit list"
            })
        }
    })

    app.get("/api/list", async (req, res) => {
        const user = await getUserByToken(req.session?.token);
        
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to get all lists"
            })
            return;
        }

        const lists = await List.find({
            creator: user._id
        }).exec()

        res.status(200).json({
            success: true,
            lists: lists.map(list => {
                return {
                    id: list._id,
                    title: list.title,
                    options: list.options
                }
            })
        })
    })

    app.get("/api/list/:list", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
            return;
        }

        const user = await getUserByToken(req.session?.token);

        const list = await List.findOne({
            _id: req.params.list
        }).exec()

        const votes = await Vote.find({
            list: req.params.list
        }).exec();

        const totals = {};
        const tiers = {
            s: [],
            a: [],
            b: [],
            c: [],
            d: [],
            f: []
        };
        let hasVoted = false;

        votes.forEach(vote => {
            if (vote.voter.toHexString() === user?._id.toHexString()) {
                hasVoted = true;
            }

            vote.votes.forEach((value, option) => {
                if (list.options.includes(option)) {
                    totals[option] = {
                        total: (totals[option]?.total || 0) + value,
                        count: (totals[option]?.count || 0) + 1
                    }
                }
            })
        })

        const averages = {};

        Object.entries(totals).forEach(entry => {
            const avg = entry[1].total / entry[1].count;
            averages[entry[0]] = avg;
            
            if (avg > 4.5) {
                tiers.s.push(entry[0])
            } else if (avg > 3.5) {
                tiers.a.push(entry[0])
            } else if (avg > 2.5) {
                tiers.b.push(entry[0])
            } else if (avg > 1.5) {
                tiers.c.push(entry[0])
            } else if (avg > 0.5) {
                tiers.d.push(entry[0])
            } else {
                tiers.f.push(entry[0])
            }
        })

        if (list && votes) {
            res.status(200).json({
                success: true,
                id: list._id,
                title: list.title,
                options: list.options,
                voteCount: votes.length,
                averages: averages,
                tiers: tiers,
                isOwn: list.creator.toHexString() === user?._id.toHexString(),
                hasVoted
            })
        } else {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }
    })

    app.post("/api/list/:list/vote", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }

        const user = await getUserByToken(req.session?.token);
        
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to vote"
            })
            return;
        }

        const list = await List.findOne({
            _id: req.params.list
        }).exec()

        if (!list) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
            return;
        }

        const votes = new Map();
        if (Array.isArray(req.body.votes)) {
            req.body.votes.forEach(vote => {
                if (Array.isArray(vote) && typeof vote[0] === "string" && list.options.includes(vote[0]) && typeof vote[1] === "number" && vote[1] >= 0 && vote[1] <= 5) {
                    votes.set(vote[0], vote[1])
                }
            });
        }

        try {
            await Vote.findOneAndUpdate({
                voter: user._id,
                list: req.params.list
            }, {
                voter: user._id,
                list: req.params.list,
                votes 
            }, {
                runValidators: true,
                upsert: true
            })
        } catch {
            res.status(400).json({
                success: false,
                error: "Invalid vote"
            })
            return;
        }

        if (list) {
            res.status(200).json({
                success: true
            })
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to cast vote"
            })
        }
    })

    app.delete("/api/list/:list/vote", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }

        const user = await getUserByToken(req.session?.token);
        
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to delete vote"
            })
            return;
        }

        const vote = await Vote.findOneAndDelete({
            voter: user._id,
            list: req.params.list
        }).exec()

        if (vote) {
            res.status(200).json({
                success: true
            })
        } else {
            res.status(400).json({
                success: false,
                error: "Failed to delete vote"
            })
        }
    })

    app.get("/api/list/:list/vote", async (req, res) => {
        if (req.params.list.length !== 24) {
            res.status(404).json({
                success: false,
                error: "List not found"
            })
        }
        
        const user = await getUserByToken(req.session?.token);
        
        if (!user) {
            res.status(401).json({
                success: false,
                error: "Must be signed in to get vote"
            })
            return;
        }

        const vote = await Vote.findOne({
            voter: user._id,
            list: req.params.list
        }).exec()

        if (vote) {
            const votes = {};
            vote.votes.forEach((value, option) => {
                votes[option] = value
            })

            res.status(200).json({
                success: true,
                votes
            })
        } else {
            res.status(200).json({
                success: true,
                votes: {}
            })
        }
    })
}