
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , mongoose = require('mongoose')
  , User = require('./models/User.model.js')
  , Media = require('./models/Media.model.js')
  , uuid = require('node-uuid')
  , AuthUser = require('./middleware/AuthUser')
    middleAuth = new AuthUser();

const YEAR_MILLIS =  31556952000;

var app = module.exports = express.createServer();

mongoose.Promise = global.Promise

//Connect to MongoDB

mongoose.connect("mongodb://localhost/memento");


// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

//setting routes that don't need auth

middleAuth.except(['/login', '/']);

// Routes

// Using middleware for checking authentication

app.all('/*', middleAuth.check);

app.get('/', function(req,res){
  res.writeHead(200, {"Content-type":"text/JSON"});
  res.write(JSON.stringify({"home":"home"}));
  res.end();
});

app.post('/login', function(req, res){ //autenticazione

 User.findUser(req.param("user_id"), function(err, user){ //cerco l'utente con l'username richiesto

    if(user == undefined){ //se l'utente non esiste
      res.writeHead(503, {"Content-type": "text/JSON"});
      res.write(JSON.stringify({
        result : "ERR",
        error : {
          code: 1,
          errMsg: "user not found"
        }
      }));
    }

     user.auth(req.param("pass"), function(match){ //controllo che le password siano uguali
        if(match){
             var token = uuid.v1();
             var expire = ( new Date().getTime() + YEAR_MILLIS );
            user.createSession(req.connection.remoteAddress,token,expire, null, function(err, user){
              if(err) throw err;
                res.writeHead(200, {"Content-type": "text/JSON"});
                res.write(JSON.stringify({
                  result : "OK",
                  error : 0,
                  session : {
                    token : token,
                    expire : expire
                  }
                })); //do la risposta in JSON con codice 200: OK
                res.end();

            });

        }else{
          res.writeHead(503, {"Content-type": "text/JSON"});
          res.write(JSON.stringify({
            result : "ERR",
            error : {
              code : 3,
              errMsg: "bad credentials"
            }
          })); //do la risposta di errore con codice 503: Bad credentials
          res.end();
        }
     });
 });

});


 /*
  * Start User HTTP action
 */

 app.post('/user', function(req, res){

     User.findAll(function(err, users){
       if(err) console.log("Error: " + err);
       res.writeHead(200, {"Content-type": "text/JSON"});
       res.write(JSON.stringify(users));
       res.end();
     })
 });

 app.post('/user/', function(req, res){

   var user = new User({ //create new user
     _id : req.param("user_id"),
     name : req.param("name"),
     surname: req.param("surname"),
     e_mail: req.param("e_mail"),
     password: req.param("password"),
     date_of_birth: req.param("date_of_birth"),
     avatar: "avatar",
     sex: req.param("sex"),
   });

   console.log("Created new user: "+ user._id);


   res.writeHead(201, {"Content-type": "text"});

     res.end(JSON.stringify({ //response
       result : "OK",
       error : 0
     }));
 });
/*
*    Request using information, passing user id

*/
app.get('/user/:id', function(req, res){
    var id = req.params.id;
    res.writeHead(200, {"Content-type": "text"});

    User.findUser(id, function(err, user){
        if(err) throw err;
        res.write(JSON.stringify(user));
        res.end();
    });
});

/*

* Request deleting user profile

*/

app.delete('/user/:id', function(req,res){
  var id = req.params.id;
  res.writeHead(200, {"Content-type": "text"});
  res.end("Delete " + id +" profile");
});

/*

* Request edit profile

*/

app.put('/user/:id', function(req, res){ /
  var id = req.params.id;
  res.writeHead(200, {"Content-type": "text/JSON"});
  res.end("Update "+ id +" profile");
});

/*
* END User HTTP Action
*/

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
