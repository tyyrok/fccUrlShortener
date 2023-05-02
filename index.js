require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}

let urlSchema = new mongoose.Schema({
  url_id: Number,
  url: String
});
let Url = mongoose.model("Url", urlSchema);


const bodyParser = require("body-parser");
const dns = require("node:dns");


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: "false" }));
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// URL Shortener Endpoint
app.post('/api/shorturl', function(req, res) {
  let urlForProcess = req.body.url;
  if (!urlForProcess) return res.json({ error: "invalid url" });
  
  let cleanUrl;
  
  if (urlForProcess.match(/\/\//g)) {
    cleanUrl = urlForProcess.split("//")[1];
    
    if (cleanUrl.match(/\//g)) {
      cleanUrl = cleanUrl.split("/")[0];
    }
    
  } else return res.json({ error: "invalid url" });

  // Check if submitted address is correct
  dns.resolveAny(cleanUrl, (err) => {
    if (err) {
      return res.json({ error: "invalid url" });
    }
    else {
      function addNewUrl(done) {
        let currentDbIndex = 1;
        let currentIndex = Url.find({ }, (err, data) => {
            if (err) return console.log(err);
            currentDbIndex = data[0].url_id;
          done(null, currentDbIndex);
        }).sort({ url_id : - 1}).limit(1);
        
        function done(err, index){
          if (err) return console.log(err);
          let newShortUrl = new Url({ url_id:  (index + 1), url: urlForProcess });
          newShortUrl.save(function(err, data) {
            if (err) return console.log(err);
          });
          res.json({ original_url: urlForProcess, short_url: (index + 1) })
        }
      }
      addNewUrl();
    }
  });    
});

// ShortURL Endpoint
app.get('/api/shorturl/:shortUrl', function(req, res) {
  Url.findOne({ url_id : Number(req.params.shortUrl) }, (err, data) => {
    
    if (err) return res.json({ error: "No short URL found for the given input" });
    
    if (data) {
      res.redirect(301, data.url);
    } else res.json({ error: "No short URL found for the given input" });
    
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
