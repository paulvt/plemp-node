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
    path = require('path'),
    util = require("util")

// Set up the Node Express application.
var app = express.createServer(form({ keepExtensions: true,
                                      uploadDir: __dirname + '/public/upload' }));

// FIXME: dummy database
var draggables = {};
// Initialise the draggables info.
fs.readdir(__dirname + '/public/upload', function (err, files) {
  if (err)
    throw(err)
  for (var i in files) {
    if (files[i][0] == ".")
      continue;
    draggables[files[i]] = {left: 350, top: 200};
  }
});

// Application settings and middleware configuration.
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

// Server the main index file statically for now.
app.get('/', function(req, res) {
  res.redirect('/index.html');
});

// The retrieval controller:  accessed through AJAX requests by the main
// page for getting/setting the state (positions) of the draggables.
app.get('/draggables', function(req, res) {
  // Retrieve the current status of the draggables and return in JSON format.
  res.send(draggables);
});

// The upload controller: handles uploads from the main site.  This can
// either be a file or some pasted text.  After upload the controler
// redirects to the main page which includes the just uploaded file.
app.post('/draggables', function(req, res) {
  req.form.complete(function(err, fields, files) {
    if (err) {
      next(err);
    }
    else {
      console.log('File %s uploaded to %s', files.file.filename,
                                            files.file.path);
      var file_id = path.basename(files.file.path);
      draggables[file_id] = { name: files.file.filename,
                              top: 200,
                              left: 350 };
    }
  });
  res.redirect('home');
});

// The draggables controller:  provides direct access to the HTML
// generating code for draggable objects.
app.get('/draggables/:id', function(req, res) {
  var file = "../upload/" + req.params.id;
  // Stuff taken from the Camping implementation.
  drag = draggables[req.params.id];
  var default_style = "left:" + drag.left + "px;top:" + drag.top + "px;";
  console.log("Get draggable: " + file);
  res.send('<img class="draggable" id="' + req.params.id + '" ' +
                'style="' + default_style + '" src="' + file + '">');
});

// The position save controller:  access through AJAX request by the main
// page for committing position changes of the draggables to the database,
// i.e. the global state.
app.post('/draggables/:id', function(req, res) {
  console.log("Got position for draggable " + req.params.id + ";" +
              " left: " + req.body.left +
              " top: " + req.body.top);
  // Set the position for the file with the given ID.
  var new_pos = draggables[req.params.id];
  new_pos.top = req.body.top;
  new_pos.left = req.body.left;
});

// Start the application.
app.listen(3300);
console.log('Plemp! started on http://127.0.0.1:%d/', app.address().port)
