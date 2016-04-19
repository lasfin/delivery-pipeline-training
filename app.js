const newrelic = require('newrelic');

const express = require('express');
const bodyParser = require('body-parser');
const pg = require('pg');
const app = express();
const port = process.env.PORT || 5000;
const conString = process.env.DATABASE_URL || "postgres://crudtest:crudtest@localhost/crudtest";

app.locals.newrelic = newrelic;
app.set('port', port);
app.use(express.static(__dirname + '/src'));
app.use(bodyParser.json());

const fs = require('fs');
const util = require('util');
const log_file = fs.createWriteStream(__dirname + '/app.log', {flags : 'w'});
const log_stdout = process.stdout;


var log = {
  log(type, d) {
    log_file.write(new Date() + " ["+type+"] : " + util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  },

  info(d){
    this.log("INFO", util.format(d))
  },
  error(d){
    this.log("ERROR", util.format(d))
  }
};

var db_init = "CREATE TABLE IF NOT EXISTS items (id serial PRIMARY KEY , data JSON);";

exports.init_db = function(cb){
  pg.connect(conString, (err, client, done) => {
      log.info("INIT DB");
      log.info("Connected to DB "+ process.env.DATABASE_URL);
      if(err) {
        log.error('error fetching client from pool', err);
      }
      client.query(db_init, [], (err, result) => {
          if(err) {
            log.error("ERROR", 'error running query' , err);
          } else {
            log.info("INIT DB is finished");
            if (cb) { cb(); }
          }
          done();
      });
  });
};

var db = function(q, p, resp) {
    log.info("SQL: " +q);
    pg.connect(conString, (err, client, done) => {
        if(err)
            return resp('error fetching client from pool'+ err);
        client.query(q, p, (err, result) => {
            done();
            if(err)
                return resp('error running query' + err);
            resp(result.rows);
            return null;
        });
        return null;
    });
};

app.get('/', (request, resp) => {
    log.info("GET /");
    resp.render('index');
});

exports.items = function(req, cb) {
   db('SELECT * FROM items order by id desc;', [], cb);
};

exports.create = function (req, cb){
    db('insert into items (data) values($1) returning *;', [req.body], cb);
};

exports.truncate = function (req, cb){
  db('truncate table items;', [], cb);
};

app.get('/items', (request, resp) => {
    log.info("GET /items");
    exports.items(request, function(x){ resp.send(x); });
});

app.post('/items', (request, resp) => {
    log.info("POST /items", request.body);
    exports.create(request, function(x){ resp.send(x); });
});

app.delete('/items', (request, resp) => {
    log.info("DELETE /items");
    exports.truncate(request, function(x){ resp.send(x); });
});


exports.start = function() {
  app.listen(app.get('port'), () => {
    exports.init_db(function(){});
    log.info('Server is running on port ' + port);
  });
};

