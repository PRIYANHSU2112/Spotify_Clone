const mongoose =require('mongoose');
const popularSchema= new mongoose.Schema({
   
    name:{
        type:String,
        required:true,
    },
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
    },
    poster:{
        type:String,
    },
    songs:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'song',
    }]
})



module.exports=mongoose.model('popular',popularSchema);