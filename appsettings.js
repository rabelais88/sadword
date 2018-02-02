const dbsettings = {
  cashier:{
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
  },
  heroku:"postgresql://secret url"
}

module.exports = dbsettings;