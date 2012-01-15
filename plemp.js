// plemp.rb - The Plemp! application, create your own on-line pile of junk!
//
// Plemp! is Copyright © 2012 Paul van Tilburg <paul@mozcode.nl>
//
// This program is free software; you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation; either version 2 of the License, or (at your option) any later
// version.

var express = require("express")
  , db = require("./db")
  , form = require("connect-form")
  , fs = require('fs')
  , path = require('path')
  , crypto = require("crypto")
  , mime = require("mime")

// Set up the Node Express application.
var app = express.createServer(form({ keepExtensions: true,
                                      uploadDir: __dirname + '/public/upload' }));

// Retrieve the draggables info.
var draggables = db.load();

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

// The retrieval controller: accessed through AJAX requests by the main
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
      var file_id, file_name, file_mime;
      if (fields.text) {
        md5sum = crypto.createHash('md5');
        md5sum = md5sum.update(fields.text).digest('hex')
        file_id = md5sum + "." + fields.type
        file_name = "public/upload/" + file_id;
        file_mime = mime.lookup(fields.type);
        fs.writeFile(file_name, fields.text, function (err) {
          if (err)
            throw err;
          console.log('Text saved to %s', file_name);
        });
        // FIXME: prevent this file being created from the start!
        fs.unlink(files.file.path);
      }
      else {
        console.log('File %s uploaded to %s', files.file.filename,
                                              files.file.path);
        file_id = path.basename(files.file.path);
        file_name = files.file.filename;
        file_mime = files.file.mime;
      }
      draggables[file_id] = { name: files.file.filename,
                              mime: file_mime,
                              top: 200,
                              left: 350 };
    }
  });
  res.redirect('home');
});

// The draggable controller: provides direct access to the HTML
// generating code for draggable objects.
app.get('/draggables/:id', function(req, res) {
  var drag_id = req.params.id;
  var file_name = "../upload/" + req.params.id;
  console.log("Get draggable: " + drag_id);
  // Stuff taken from the Camping implementation.
  var drag = draggables[drag_id];
  var default_style = "left:" + drag.left + "px;top:" + drag.top + "px;";
  var mime_type = drag.mime.split("/")
  var title = drag.name || drag.title || 'Title not set';
  var content;
  switch (mime_type[0]) {
    case "image":
      content = '<img src="' + file_name + '"></img>';
      break;
    case "video":
      content = '<video src="' + file_name + '" controls="true"></video>';
      break;
    case "audio":
      content = '<audio src="' + file_name + '" controls="true"></audio>';
      break;
    case "text":
      file_contents = fs.readFileSync("public/upload/" + drag_id);
      content = '<pre>' + file_contents + '</pre>';
      break;
    case 'application': // FIXME: treat as code for now, but it is probably wrong
      file_contents = fs.readFileSync("public/upload/" + drag_id);
      content = '<pre><code class="' + drag.type + '">' + file_contents +
                     '</code></pre>';
      break;
    default:
      content = '<span>Unknown type: ' + mime_type + '</span>';
  }

  // Wrap the content in a div with title and comments.
  res.send('<div class="draggable" id="' + drag_id + '" ' +
                'style="' + default_style + '">' +
             '<div class="header"><div class="title">' + title +
                  '<span class="edit">(edit)</span>' +
                  '<div class="delete">X</div></div>' +
             '</div>' + content + '<div class="comments"></div>' +
           '</div>');
});

// The position save controller: access through AJAX request by the main
// page for committing position changes of the draggables to the database,
// i.e. the global state.
app.post('/draggables/:id', function(req, res) {
  console.log("Position update for draggable " + req.params.id + ";" +
              " left: " + req.body.left +
              " top: " + req.body.top);
  // Set the position for the file with the given ID.
  var new_pos = draggables[req.params.id];
  new_pos.top = req.body.top;
  new_pos.left = req.body.left;
});

// Signal handling.
process.on('SIGINT', function() { db.save(draggables); process.exit(0); });
process.on('SIGTERM', function() { db.save(draggables); process.exit(0); });

// Start the application.
app.listen(3300);
console.log('Plemp! started on http://127.0.0.1:%d/', app.address().port)
