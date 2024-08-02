var express = require('express');
var router = express.Router();
const {register}=require('../models/userModel');
var users=require('../models/userModel');
var songModel=require('../models/songModel');
var popularModel=require('../models/popularModel')
var passport=require('passport');
var multer=require('multer');
var id3=require('node-id3');
var crypto=require('crypto');
var path=require('path')
const localStrategy =require("passport-local");
passport.use(new localStrategy(users.authenticate()));
var {Readable}=require('stream');
const mongoose=require('mongoose');
const { promises } = require('dns');
const playModel = require('../models/playModel');
const userModel = require('../models/userModel');
require('dotenv').config();


mongoose.connect(process.env.MONGODB_URI).then(()=>{
  console.log("connect Data")
}).catch((err)=>{
  console.log(err);
})



// ========creat bucketfor song
const conn=mongoose.connection

var gfsBucket ;
var gfsBucketPoster;
conn.once('open',()=>{
  gfsBucket=new mongoose.mongo.GridFSBucket(conn.db,{
    bucketName:'audio',
  }),

  gfsBucketPoster=new mongoose.mongo.GridFSBucket(conn.db,{
    bucketName:'poster',
  })
});








/* GET home page. */
router.get('/',isLoggedIn,  async function(req, res, next) {
  var currentuser= await users.findOne({
    _id:req.user._id,
  }).populate('playList').populate({
      path:'playList',
      populate:{
        path:'songs',
        model:'song'
      }
  })
   
  res.render('index',{currentuser});
});

router.get('/poster/:posterName',(req,res,next)=>{
  
  gfsBucketPoster.openDownloadStreamByName(req.params.posterName).pipe(res)

})
// user authentication=================================================
// user ragister authenticate
router.post('/register',async function(req, res, next) {  
     const newUser = new users({
       username:req.body.username,
       email:req.body.email
     });
    users.register(newUser, req.body.password)
         .then(function(result){
          passport.authenticate('local')(req,res, async function(){
            const Songs =await songModel.find();
            console.log(Songs);
            const defaultplaylist= await playModel.create({
              name:req.body.username,
              owner:req.user._id,
              songs:Songs.map(song=> song._id), 
            })
            // console.log("hello");
            // console.log(defaultplaylist.songs) 
            
            const defaultplaylist2= await popularModel.create({
              name:req.body.username,
              owner:req.user._id,
              songs:Songs.map(song=> song._id), 
            })
            
            // console.log(defaultplaylist2.songs)

            const newUser=await users.findOne({
              _id:req.user._id,
            })
            // creat 
            newUser.playList.push(defaultplaylist._id)
            newUser.playList.push(defaultplaylist2._id)
            await newUser.save()
            
            // iske bad ye banan fir /route pe past kar dena
            // const currentuser= await users.findOne({
            //   _id:req.user._id,
            // }).populate('playList').populate({
            //   path:'playList',
            //   populate:'songs',
            //   model:'song',
            //   })
            //   console.log(JSON.stringify(currentuser))
        
             res.redirect('/')
           })
         })
         .catch((err) => {
           res.send(err);
         })
  });
    router.get('/auth',(req,res,next)=>{
    res.render('register');
  })
// user login authenticate
 router.post('/login',passport.authenticate('local',{
    successRedirect:'/',
    failureredirect:'/login'
  }),(req,res,next)=>{});
//  user logout authenticate
router.get('/logout',(req,res,next)=>{
 if(req.isAuthenticated){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
 }else{ 
  res.redirect('/login');
 }
});


// upload musci
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
router.get('/uploadmusic',(req,res,next)=>{
  res.render('uploadmusic');
})
router.post('/uploadmusic', upload.array('song'), async (req,res,next)=>{

await Promise.all(req.files.map(async file=>{  
  // console.log(req.files)

const randomName=crypto.randomBytes(20).toString('hex'); 
const songData=id3.read(file.buffer); 

Readable.from(file.buffer).pipe(gfsBucket.openUploadStream(randomName))
Readable.from(songData.image.imageBuffer).pipe(gfsBucketPoster.openUploadStream(randomName+'poster'))
  
await songModel.create({
  artist:songData.artist,
  title:songData.title,
  album:songData.album,
  size:file.size,
  poster:randomName+'poster',
  filename:randomName, 
})
}))
   res.send("song upload");
})

// Stream the musci==========================
router.get('/stream/:musicName', async (req,res,next)=>{

   const currentSong= await songModel.findOne({filename:req.params.musicName});
   console.log(currentSong)
  
  
  const stream=gfsBucket.openDownloadStreamByName(req.params.musicName);
  res.set('Content-Type','audio/mpeg')
  res.set('Content-Length',currentSong.size+1)
  res.set('Content-Range', `bytes 0-${currentSong.size - 1}/${currentSong.size}`)
  res.set('Content-Ranges','byte')
  res.status(206)
  stream.pipe(res)
   
   })


// =======isloggedin function
function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  else{
    res.redirect('/auth');
  }
}
// ======isAdmin function
function isAdmin(req,res,next){
  if(req.user.isAdmin)return next()
  else return res.redirect('/');
}



  //  =======musicaddtolist==============
  router.get('/openplaylist/:listId',isLoggedIn,async (req,res,next)=>{
    // currentUser
    //currentPlaylist
    let currentUser =await users.findOne({username:req.session.passport.user});
    let currplaylist=await playModel.findOne({_id:req.params.listId}).populate("songs")

    // res.send(`current user is ${currentUser} and the playlist is ${currentPlaylist}`)
       res.render("playlistopen",{currentUser,currplaylist})
  })
  


router.post("/createplaylist",isLoggedIn, async (req, res, next) => {
  let user = await users.findOne({ username: req.session.passport.user});
  console.log(user)
  let newplay = await playModel
    .create({
      name: req.body.name,
      owner: user._id,
      songs: [],
    })
    .then(function (createdp) {
      user.playList.push(createdp._id);
      user.save();
      res.redirect("/");
      // res.send(`name--${req.body.name} == owner --${user._id}== username: ${user}------rrrr${createdp}  `)
    });
});

router.get("/addsong/:id",isLoggedIn, async (req, res, next) => {
  let currentUser = await users.findOne({
    username: req.session.passport.user,
  });
  let allSongs = await songModel.find();
  let currplaylist = await playModel
    .findById(req.params.id)
    .populate("songs");
  //  console.log(` this is current playlist---+${currplaylist} and the  current user is --${currentUser}`);
  res.render("playlist", { allSongs, currplaylist, currentUser });
   
});

// Handle the delete playlist request
router.get("/deleteplaylist/:playlistId",isLoggedIn, async (req, res) => {
  let person = await users.findOne({ username: req.session.passport.user});
  const playlistId = req.params.playlistId;
  console.log(playlistId);
  const index = 1;

  // Before the splice operation
  console.log("Index to remove:", index);
  // console.log("Playlist to remove:", person.playlist[index]);

  if (index) {
    // Remove the playlist from the array using splice
    person.playList.splice(index, 1);
    console.log("Playlist removed");
    await person.save();
    console.log("User saved with updated playlist:", person.playList);

    // You should also save the changes to your data store here.

    // Redirect the user to the page displaying the updated playlists
    res.redirect("back"); // Change '/playlists' to your actual playlist page URL
  } else {
    // Handle the case where the playlist with the given _id was not found
    res.status(404).send("Playlist not found");
  }
});

// Insert song======================
router.get("/insertsong/:playlistId/:songId",isLoggedIn, async (req, res, next) => {
  let user = await users.findOne({ username: req.session.passport.user });
  console.log(user)
  let playlist = await playModel.findOne({ _id: req.params.playlistId });
  let song = await songModel.findOne({ _id: req.params.songId });

  playlist.songs.push(song._id);
  playlist.save();

  // res.send(`user is ${user} and playlist is ${playlist} and song is ${song}`);
  res.redirect("back");
});

// router.get("/addsong/:id",isLoggedIn, async (req, res, next) => {
//   let currentUser = await users.findOne({
//     username: req.session.passport.user,
//   });
//   let allSongs = await songModel.find();
//   let currplaylist = await playModel
//     .findById(req.params.id)
//     .populate("songs");
//   //  console.log(` this is current playlist---+${currplaylist} and the  current user is --${currentUser}`);
//   res.render("playlist", { allSongs, currplaylist, currentUser });
   
// });

router.get("/library",(req,res,next)=>{
  res.render('library');
})


router.get("/library/:playlistId/:songId",isLoggedIn, async(req,res,next)=>{
  // let currentUser = await users.findOne({username:req.session.passport.user});
  let songId= await songModel.findOne({_id:req.params.songId})
  let playlist=await popularModel.findOne({_id:req.params._id});
  if(playlist){
    console.log("hey")
  }else{
    console.log("hello");
  }
  })

  router.get("/search",isLoggedIn, async (req,res,next)=>{
    let currentuser = await users.findOne({
      username: req.session.passport.user,
    });
    res.render('search',{currentuser});
  })
  router.post("/search", async (req,res,next)=>{
    const searchMusic= await songModel.find({
      title:{$regex:req.body.search}
    })
    res.json({
      songs:searchMusic
    })
  })













module.exports = router;
