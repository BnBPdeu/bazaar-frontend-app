import mongoose, { mongo }  from "mongoose" ;
import { required } from "zod/mini";


const shares = new mongoose.Schema({
    shareName : {
        type : String,
        required : true
    },
    price : {
        type : Number,
        required : true,
    },
    symbol : {
      type : String,
      required : true
    },
    sector : {
      type : String,
      required : true
    },
    image : {
       type : String,
    },
    history: [
      {
        timestamp: { type: Date, default: Date.now }, // candle start time
        open: Number,
        high: Number,
        low: Number,
        close: Number,
        // every 5-second tick price stored here
        ticks: [
          {
            changesprice: Number,
            time: { type: Date, default: Date.now },
          },
        ],
      },
    ],
},{ timestamps : true});

export const  Shares = mongoose.model('Shares',shares)