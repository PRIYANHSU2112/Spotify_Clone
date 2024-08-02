const mongoose=require('mongoose');
const plm=require('passport-local-mongoose');


const userSchema=new mongoose.Schema({
    username:String,
    email:String,
    contect:String,
    playList:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'playList'    
        }
    ],
    likes:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'song'
        }
    ],
    profileImage:{
        type:String,
        default:'def.png'
    },
    isAdmin:{
       type:Boolean,
       default:false,
    }
    
})
userSchema.plugin(plm);
const userModel=mongoose.model('user',userSchema);

module.exports=userModel;