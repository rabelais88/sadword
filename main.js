/* sad word - node postgres + rest + jquery example web app */
var fs = require("fs");
var ejs = require("ejs");
var app = require("express")();
var http = require("http").Server(app);
var bodyParser = require("body-parser");
var uuid = require("uuid/v4");
/* setting up postgreSQL */
const pgp = require("pg-promise")(/* promise options */);
const moment = require("moment");


const pgconfig = {
  user: "postgres",
  host: "localhost",
  database: "sadword",
  password: "testhotel1",
  port:5432,
  /*
    if it's heroku, replacce those with this:
    connectionString : "postgresql://dbuser: ...."

  */
  poolSize:10, /* max number of clients */
  idleTimeoutMillis:30000
};

/* connection is auto-configured from npm library, it isn't necessary */
var db = pgp(pgconfig);

app.set("view engine", "ejs");
/* initialize bodyparser to build up RESTful app */
app.use(bodyParser.urlencoded({ extended:false}));
app.use(bodyParser.json());
  
http.listen(process.env.PORT || 3000,function(){
  console.log("server is up at " + this.address().port);
});
  
/*
  db structure:
  create table sw_article (article_id serial primary key, writer_ip inet, article_content varchar(200), article_time timestamp);
  create table sw_score (score_id serial primary key, scorer_ip inet, score boolean not null, article_id integer references sw_article(article_id));
  create table sw_comment (comment_id serial primary key, commenter_ip inet, article_id integer references sw_article(article_id), comment_content varchar(150));
*/

function getArticle(beginRow,endRow,callback){
  var rowLength = endRow - beginRow;
  db.any("SELECT writer_ip, article_content, article_id FROM sw_article LIMIT " + rowLength + " OFFSET " + beginRow)
  .then(function(data){
    var dataArticle = [];
    //console.log("current rowlength:" + data.length);
    /* data is provided in an array type made up of anonymous object elements */
    data.forEach(function(elArticle){
      dataArticle[elArticle.article_id] = elArticle;
      dataArticle[elArticle.article_id].comment = [];
    });
    db.any("SELECT * FROM sw_comment WHERE article_id BETWEEN " + beginRow + " AND " + endRow)
    .then(function(dataComment){
      dataComment.forEach(function(elComment){
        var newcomment = {
          commenter_ip:elComment.commenter_ip,
          comment_content:elComment.comment_content,
          comment_id:elComment.comment_id
        };
        dataArticle[elComment.article_id].comment.push(newcomment);
      });
      console.log(dataArticle);
      callback(dataArticle);
    })
    .catch(function(err){
      console.log(err);
    });
  })
  .catch(function(err){
    console.log(err);
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
  console.log(nowFormatted + " - article add request :" + req);
  /*
  db.one("INSERT INTO sw_article (writer_ip, article_content, article_time) VALUES ($1, $2, $3)", ["123.1.1.1", req.article, nowFormatted])
  .then(function(data){

  })
  .catch(function(err){

  });
  */
  res.redirect("/");
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
    console.log(err);
  });
});

