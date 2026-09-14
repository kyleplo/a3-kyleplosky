import { Schema, model, Types } from "mongoose";

const userSchema = new Schema({
    username: {
        required: true,
        type: String,
        match: /^[a-zA-Z0-9\-\_]{4,20}$/
    },
    password: {
        required: false,
        type: String
    },
    ghId: {
        required: false,
        type: Number
    },
    token: {
        required: true,
        type: String,
        match: /^[a-zA-Z0-9\-\_]{1,12}$/
    },
    tokenExpiry: {
        required: true,
        type: Number,
        min: 0
    }
})
export const User = model("User", userSchema)

const listSchema = new Schema({
    title: {
        required: true,
        type: String,
        match: /^[\x20-\x7e]{4,100}$/
    },
    options: {
        required: true,
        type: [{
            required: true,
            type: String,
            match: /^[\x20-\x7e]{1,100}$/
        }],
        validate: val => Array.isArray(val) && val.length >= 2 && val.length <= 100
    },
    creator: {
        required: true,
        type: Types.ObjectId
    }
})
export const List = model("List", listSchema)

const voteSchema = new Schema({
    voter: {
        required: true,
        type: Types.ObjectId
    },
    list: {
        required: true,
        type: Types.ObjectId
    },
    votes: {
        type: Map,
        of: {
            type: Number,
            min: 0,
            max: 5
        }
    }
})
export const Vote = model("Vote", voteSchema)