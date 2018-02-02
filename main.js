/* sad word - node postgres + rest + jquery example web app */
var fs = require("fs")
var ejs = require("ejs")
var app = require("express")()
var http = require("http").Server(app)
var bodyParser = require("body-parser")
var uuid = require("uuid/v4")
/* setting up postgreSQL */
const pgp = require("pg-promise")(/* promise options */)
const moment = require("moment")
const dbsettings = require("./appsettings.js")

app.set("view engine", "ejs");


function getSettings (){
  if(!process.argv[2]){
    console.log("config has not set up! please enter proper settings - node main.js [setting]\navailable settings are...\n")
    Object.keys(dbsettings).map((el) => {
      console.log(el)
    })
    process.exit()
  }else{
    let result = {};
    Object.keys(dbsettings).map((el) => {
      if(el === process.argv[2]){
        if(dbsettings[el] instanceof Object){
          //if setting is an object
          result = Object.assign(dbsettings[el])
        }else{
          //if setting is a string
          result = dbsettings[el]
        }
      }
    })
    return result;
  }
}

const pgconfig = getSettings()
console.log("try logging in with the info below :")
console.log(pgconfig)
/* connection is auto-configured from npm library, it isn't necessary */
var db = pgp(pgconfig)


/* initialize bodyparser to build up RESTful app */
app.use(bodyParser.urlencoded({ extended:false}));
app.use(bodyParser.json());
  
http.listen(process.env.PORT || 3000, function(){
  console.log("server is up at " + this.address().port);
});
  
/*
  db structure:
  create table sw_article (article_id serial primary key, writer_ip inet, article_content varchar(200), article_time timestamp);
  create table sw_score (score_id serial primary key, scorer_ip inet, score boolean not null, article_id integer references sw_article(article_id));
  create table sw_comment (comment_id serial primary key, commenter_ip inet, article_id integer references sw_article(article_id), comment_content varchar(150));
*/

/*
  some tips before continue coding...
  1. since versions of node higher than 6.x.x, every promise has to be chained with catch
     this means every pg-promise functions has to be chained with .catch
  2. pg-promise often returns very weird errors. ALWAYS trace errors with process.on('unhandledRejection', r => console.log(r));
     some of pg-promise errors are caused by thought-to-be-unrelated stuff, so try find any wrong codes inside pg-promise brackets
*/

function getIP(req){
  var ip = req.headers['x-forwarded-for'] || 
  req.connection.remoteAddress || 
  req.socket.remoteAddress ||
  (req.connection.socket ? req.connection.socket.remoteAddress : null);
  return ip;
}

function getVote(ip,callback){
  db.any("SELECT score FROM sw_score WHERE scorer_ip=$1",[ip])
  .then(function(data){
    console.log("previous score data from " + ip + " : " + data);
    /* 
       source of all problem...probably something has to do with dynamic type 
       try...catch instead of if(data) or if(data.length > 0)
       very good lesson for later works
       wrong value type causes "Unhandled Promise Rejection Errors"
    */
    try{
      callback(data[0].score);
    }catch(err){
      callback(0);
    }
  })
  .catch(function(err){
    console.log(err)
  });
}

function getArticle(beginRow,endRow,callback){
  var rowLength = endRow - beginRow;
  db.multi("SELECT * FROM sw_article LIMIT " + rowLength + " OFFSET " + beginRow + 
  ";SELECT * FROM sw_comment WHERE article_id BETWEEN " + beginRow + " AND " + endRow +
  ";select * from (select article_id, sum(score::int) from sw_score group by article_id) as tmp LIMIT " + rowLength + " OFFSET " + beginRow)
  .then(function(data){
    var dataArticle = [];
    //console.log("current rowlength:" + data.length);
    /* data is provided in an array type made up of anonymous object elements */
    data[0].forEach(function(elArticle){
      dataArticle[elArticle.article_id] = elArticle;
      dataArticle[elArticle.article_id].comment = [];
    });

    data[1].forEach(function(elComment){
      var newcomment = {
        commenter_ip:elComment.commenter_ip,
        comment_content:elComment.comment_content,
        comment_id:elComment.comment_id
      };
      dataArticle[elComment.article_id].comment.push(newcomment);
    });

    data[2].forEach(function(elScore){
      dataArticle[elScore.article_id].score = elScore.sum;
    });

    /* sorted by score */
    dataArticle.sort(function(a,b){
      return Math.round(a.score) - Math.round(b.score);
    });

    return callback(dataArticle);
  })
  .catch(function(err){
    //res.render("error.ejs",{errormsg:err}); -> this caused error because .res is not accessible inside indepenedent function. use different view model when projecting error.
    console.log(err)
  });
}

app.get("/",function(req,res){
  /* EVERY postgres action is async. => always use callback to print out the result */
  getArticle(0,10,function(dataRes){
    res.render("index.ejs", {articles:dataRes});
  });
});

app.get("/write",function(req,res){
  res.render("write.ejs");
});

app.post("/write",function(req,res){
  var currentTime = moment();
  var nowFormatted = currentTime.format("YYYY-MM-DD HH:mm:ss");
  /* always add .body to access req data */
  console.log(nowFormatted + " - article add request : " + req.body.article + "(" + getIP(req) + ")");
  db.none("INSERT INTO sw_article (writer_ip, article_content, article_time, article_password) VALUES ($1, $2, $3, $4)", [getIP(req), req.body.article, nowFormatted, req.body.password])
  .then(function(){
    res.redirect("/");
  })
  .catch(function(err){
    res.render("error.ejs",{errormsg:err});
  });
});

app.post("/comment",function(req,res){
  console.log("comment add request:");
  console.log(req.body.replyText, req.body.articleid);
  db.none("INSERT INTO sw_comment (commenter_ip, comment_content, article_id) VALUES ($1, $2, $3)",[getIP(req),req.body.replyText,req.body.articleid])
  .then(function(){
    res.redirect("/");
  }).catch(function(err){
    res.render("error.ejs",{errormsg:err});
  });
});

app.get("/info",function(req,res){
  res.render("info.ejs")
});

app.get("/modify/:articleid", (req,res) => {
  const articleid = Math.round(req.params.articleid)
  console.log("article No." + articleid + " - request modify")
  db.one("SELECT article_content FROM sw_article WHERE article_id=" + articleid)
  .then((sqldata) => {
    res.render("modify.ejs", {data: {id:articleid, content:sqldata.article_content} })
  })
  .catch((err) => {
    res.render("error.ejs",{errormsg:err})
  })
})

app.get("/delete/:articleid", (req,res) => {
  console.log("article No." + articleid + " - request delete")
  const articleid = Math.round(req.params.articleid)
  res.render("delete.ejs", {data:articleid});
})

app.post("/thumbup/:articleid", (req,res) => {
  const articleid = Math.round(req.params.articleid)
  console.log("article No." + articleid + " - request thumbup")
})

app.post("/thumbdown/:articleid", (req, res) => {
  const articleid = Math.round(req.params.articleid)
  console.log("article No." + articleid + " - request thumbdown")
})

app.get("/:articleid",function(req,res){

  if(req.query.act=="up"){
    /* recommendation */
    getVote(getIP(req), function(scoreX){
      var score = Math.round(scoreX);
      if (score == 1) {
        console.log(score + " plus voted before!");
        res.render("error.ejs",{errormsg:"이미 투표를 했습니다"}); 
      }else if(score == -1){
        console.log(score + " minus voted before!");
        db.none("UPDATE sw_score SET score=1 WHERE scorer_ip=$1 AND article_id=$2",
        [getIP(req),articleid])
        .then(function(){
          res.redirect("/");
        }).catch(function(err){
          res.render("error.ejs",{errormsg:err});
        });
      }else{
        console.log(score + " haven't voted before!");
        db.none("INSERT INTO sw_score (scorer_ip, score, article_id) VALUES ($1, $2, $3)",
        [getIP(req),1,articleid])
        .then(function(){
          res.redirect("/");
        }).catch(function(err){
          res.render("error.ejs",{errormsg:err});
        });
      }
    });
  }else if(req.query.act=="down"){
    /* denunciation */
    getVote(getIP(req), function(scoreX){
      var score = Math.round(scoreX);
      if (score == -1) {
        console.log(score + " minus voted before!");
        res.render("error.ejs",{errormsg:"이미 투표를 했습니다"}); 
      }else if(score == 1){
        console.log(score + " plus voted before!");
        db.none("UPDATE sw_score SET score=-1 WHERE scorer_ip=$1 AND article_id=$2",
        [getIP(req),articleid])
        .then(function(){
          res.redirect("/");
        }).catch(function(err){
          res.render("error.ejs",{errormsg:err});
        });
      }else{
        console.log(score + " haven't voted before!");
        db.none("INSERT INTO sw_score (scorer_ip, score, article_id) VALUES ($1, $2, $3)",
        [getIP(req),-1,articleid])
        .then(function(){
          res.redirect("/");
        }).catch(function(err){
          res.render("error.ejs",{errormsg:err});
        });
      }
    });
  }
});


app.post("/deleteconfirm/:articleid",function(req,res){
  var articleid = Math.round(req.params.articleid);
  db.one("SELECT article_password FROM sw_article WHERE article_id=" + articleid)
  .then(function(data){
    console.log("received pw : " + req.body.password + " =?= pw on db : " + data.article_password);
    if (req.body.password == data.article_password || data.article_password == null){
      db.none("DELETE FROM sw_article WHERE article_id=" + articleid)
      .then(function(){
        res.redirect("/");
      })
      .catch(function(err){
        res.render("error.ejs",{errormsg:err});
      });
    }else{
      res.render("error.ejs",{errormsg:"비밀번호가 일치하지 않습니다"});
    }
  })
  .catch(function(err){
    res.render("error.ejs",{errormsg:err});
  });
});

app.post("/modifyconfirm/:articleid",function(req,res){
  var articleid = Math.round(req.params.articleid);
  db.one("SELECT article_password FROM sw_article WHERE article_id=" + articleid)
  .then(function(data){
    console.log("received pw : " + req.body.password + " =?= pw on db : " + data.article_password);
    if (req.body.password == data.article_password || data.article_password == null){
      db.none("UPDATE sw_article SET article_content='" + req.body.article + "' WHERE article_id=" + articleid)
      .then(function(){
        res.redirect("/");
      })
      .catch(function(err){
        res.render("error.ejs",{errormsg:err});
      });
    }else{
      res.render("error.ejs",{errormsg:"비밀번호가 일치하지 않습니다"});
    }
  })
  .catch(function(err){
    res.render("error.ejs",{errormsg:err});
  });
});

app.get("/today",function(req,res){
  db.any("SELECT writer_ip, article_content FROM sw_article LIMIT 10")
  .then(function(data){
    console.log("current rowlength:" + data.length);
    /* data is provided in an array type made up of anonymous object elements */
    console.log(data);
    res.render("index.ejs", {data:data});
  })
  .catch(function(err){
    res.render("error.ejs",{errormsg:err});
  });
});

process.on('unhandledRejection', r => console.log(r));
