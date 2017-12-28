/* sad word - node postgres + rest + jquery example web app */
var fs = require("fs");
var ejs = require("ejs");
var app = require("express")();
var http = require("http").Server(app);
var bodyParser = require("body-parser");
var uuid = require("uuid/v4");
/* setting up postgreSQL */
const pgp = require("pg-promise")(/* promise options */);

const pgconfig = {
  user: "postgres",
  host: "localhost",
  database: "sadword",
  password: "devtest1",
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
  
app.get("/",function(req,res){
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

app.get("/write",function(req,res){
  res.render("write.ejs");
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

