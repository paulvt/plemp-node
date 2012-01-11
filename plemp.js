// plemp.rb - The Plemp! application, create your own on-line pile of junk! 
//  
// Plemp! is Copyright © 2012 Paul van Tilburg <paul@mozcode.nl>
//  
// This program is free software; you can redistribute it and/or modify it under 
// the terms of the GNU General Public License as published by the Free Software 
// Foundation; either version 2 of the License, or (at your option) any later  
// version.

var express = require("express"),
    form = require("connect-form"),
    fs = require('fs'),
    util = require("util")

// Set up the Node Express application.
var app = express.createServer(form({ keepExtensions: true}));

// Application settings and middleware configuration.
app.configure(function() {
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Server the main index file statically for now.
app.get('/', function(req, res) {
  res.redirect('/index.html');
});

// The current route: accessed through AJA requests by the main page
// for getting the current (global) state (positions) of the draggables.
app.get('/current', function(req, res) {
  // Retrieve the current status of the draggables and return in JSON format.
});

// The position save route: access through AJAX request by the main page
// for committing position changes of the draggables to the database, i.e. the
// global state.
app.get('/savepos/:id/:x-pos/:y-pos', function(req, res)) {
  // Set the position for the file with the given ID.
});

// The upload route: handles uploads from the main site.  This can either
// be a file or some pasted text.  After upload the controler redirects to
// the main page which includes the just uploaded file.
app.post('/upload', function(req, res, next) {
  req.form.complete(function(err, fields, files) {
    if (err) {
      next(err);
    }
    else {
      var is = fs.createReadStream(files.file.path);
      var os = fs.createWriteStream('upload/' + files.file.filename);

      util.pump(is, os, function() {
          fs.unlinkSync(files.file.path);
          console.log('File %s uploaded to %s', files.file.filename,
                                                files.file.path);
      });
    }
  });
  res.redirect('home');
});

// Start the application.
app.listen(3300);
console.log('Plemp! started on http://127.0.0.1:%d/', app.address().port)
