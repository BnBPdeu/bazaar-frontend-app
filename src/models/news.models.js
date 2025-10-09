import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
    title : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    sector : {
        type : String,
        required : true
    },
    changePercent : {
        type : Number,
        required : true
    },
    durationSec : {
        type : Number,
        required : true
    },
}, { timestamps: true });


export const News = mongoose.model("News",newsSchema)