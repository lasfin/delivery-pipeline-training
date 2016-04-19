var newrelic = require('newrelic');

var express = require('express');
var bodyParser = require('body-parser');
var pg = require('pg');
var app = express();
var port = process.env.PORT || 5000;
var conString = process.env.DATABASE_URL || "postgres://crudtest:crudtest@localhost/crudtest";

app.locals.newrelic = newrelic;
app.set('port', port);
app.use(express.static(__dirname + '/src'));
app.use(bodyParser.json());

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/app.log', {flags : 'w'});
var log_stdout = process.stdout;


var log = {
  log : function(type, d) {
    log_file.write(new Date() + " ["+type+"] : " + util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  },

  info: function(d){
    this.log("INFO", util.format(d))
  },
  error: function(d){
    this.log("ERROR", util.format(d))
  },
}

var db_init = "CREATE TABLE IF NOT EXISTS items (id serial PRIMARY KEY , data JSON);";

exports.init_db = function(cb){
  pg.connect(conString, function(err, client, done) {
      log.info("INIT DB");
      log.info("Connected to DB "+ process.env.DATABASE_URL);
      if(err) {
        log.error('error fetching client from pool', err);
      }
      client.query(db_init, [], function(err, result) {
          if(err) {
            log.error("ERROR", 'error running query' , err);
          }else {
            log.info("INIT DB is finished");
            if (cb) { cb(); }
          }
          done();
      });
  });
}

var db = function (q, p, resp){
    log.info("SQL: " +q);
    pg.connect(conString, function(err, client, done) {
        if(err)
            return resp('error fetching client from pool'+ err);
        client.query(q, p, function(err, result) {
            done();
            if(err)
                return resp('error running query' + err);
            resp(result.rows);
            return null;
        });
        return null;
    });
};

app.get('/', function(request, resp) {
    log.info("GET /");
    resp.render('index');
});

exports.items = function (req, cb){
   db('SELECT * FROM items order by id desc;', [], cb);
};

exports.create = function (req, cb){
    db('insert into items (data) values($1) returning *;', [req.body], cb);
};

exports.truncate = function (req, cb){
  db('truncate table items;', [], cb);
};

app.get('/items', function(request, resp) {
    log.info("GET /items");
    exports.items(request, function(x){ resp.send(x); });
});

app.post('/items', function(request, resp) {
    log.info("POST /items", request.body);
    exports.create(request, function(x){ resp.send(x); });
});

app.delete('/items', function(request, resp) {
    log.info("DELETE /items");
    exports.truncate(request, function(x){ resp.send(x); });
});


exports.start = function() {
  app.listen(app.get('port'), function() {
    exports.init_db(function(){});
    log.info('Server is running on port ' + port);
  });
}

