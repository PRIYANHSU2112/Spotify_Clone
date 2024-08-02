const mongoose =require('mongoose');
const songSchema= new mongoose.Schema({

    title:String,   
    artist:String,
    category:[
       {
        type:String,
        album:['pungabi','gujrati']
       }
    ],
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'user'
        }
    ],
    poster:String,
    size:Number,
    filename:{
        type:String,
        required:true,
    },
})



module.exports=mongoose.model('song',songSchema);