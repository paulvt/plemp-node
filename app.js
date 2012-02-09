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
  , url = require("url");

// Set up the Node Express application.
var app = express.createServer(form({ keepExtensions: true,
                                      uploadDir: __dirname + '/public/upload' }));

// List of events.
var events = [];
// List of deferred requests/connections.
var defers = [];
// Maximum age of events (in seconds).
var maxAge = 3600;
// Request sequence number.
var lastRequestId = 0;

// Return the current time time in milliseconds.
function currentTimestamp() {
  return new Date().getTime();
}

// Compacts an array by removing all undefined values.
function compact(arr) {
  if (!arr) return null;

  var i, data = [];
  for (i = 0; i < arr.length; i++) {
    if (arr[i]) data.push(arr[i]);
  }
  return data;
}

// Add a new event with the given type and optional data.
function addEvent(type, data) {
  var event = { type: type,
                timestamp: currentTimestamp() }
  if (data) event.data = data;

  events.push(event);
  console.log("[P] " + JSON.stringify(event));
  // Notify deferred connections that there is something new.
  notify();
}

// Find the next event in the list of events after the optional timestamp.
// Expires events that are older than the maximum age (maxAge).
function nextEvent(timestamp) {
  if (!events) return null;
  if (!timestamp) timestamp = 0;

  var event, nEvent, i;
  var minTimestamp = currentTimestamp() - maxAge * 1000;
  for (i = 0; i < events.length; i++) {
    event = events[i];

    // Check if event is expired.
    if (event.timestamp < minTimestamp) {
      console.log("[.] expired: " + JSON.stringify(event));
      delete events[i];
      continue;
    }
    // Check if event is newer.
    if (event.timestamp > timestamp) {
      console.log("[.] next event after timestamp " + timestamp + ": " +
                  JSON.stringify(event));
      nEvent = event;
      break;
    }
  }
  // Compact the list of events.
  events = compact(events);
  return nEvent;
}

// Notify all deferred connections of their respect nextEvent.
function notify() {
  if (!defers) return;

  var i, ctx, event;
  for (i = 0; i < defers.length; i++) {
    ctx = defers[i];

    if (!ctx.req) {
      delete defers[i];
      continue;
    }

    event = nextEvent(ctx.timestamp);
    if (event) {
      ctx.req.resume();
      ctx.res.send(event);
      ctx.res.end();
      delete defers[i];
      console.log("[" + ctx.id + "] sent " + JSON.stringify(event));
    }
  }
  // Compact the list of deferred connections.
  defers = compact(defers);
}

// Save and pause the request.
function pause(timestamp, req, res, requestId) {
  var ctx = { id: requestId,
              timestamp: timestamp,
              req: req,
              res: res };
  defers.push(ctx);

  req.connection.setTimeout(600 * 1000);
  req.connection.on('timeout', function() {
    ctx.req = null;
    ctx.res = null;
    console.log("[" + requestId, "] timeout");
  });

  req.pause();
  console.log("[" + requestId + "] paused");
}

// Retrieve the draggables info.
var draggables = db.load();
for (drag_id in draggables) {
  if (!path.existsSync(__dirname + "/public/upload/" + drag_id)) {
    console.log("Could not find draggable " + drag_id +
                "; removing from database!");
    delete draggables[drag_id];
  }
}

// Application settings and middleware configuration.
app.configure(function() {
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
  app.use(express.errorHandler());
});

// Server the main index file statically for now.
app.get('/', function(req, res) {
  res.redirect('/index.html');
});

// The events controller: accessed through AJAX long-poll requests by the
// main page for getting new events.
app.get('/events', function(req, res) {
  var u = url.parse(req.url, true);

  if (!u.query) {
    res.send(null, 400);
    return;
  }

  var timestamp = u.query.timestamp || 0,
      requestId = lastRequestId++,
      event = nextEvent(timestamp);

  if (!event) {
    pause(timestamp, req, res, requestId);
  }
  else {
    res.send(event);
    res.end();
    console.log("[" + requestId + "] direct sent " + JSON.stringify(event));
  }
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
      // FIXME: next is undefined!
      next(err);
    }
    else {
      var file_id, file_name, file_mime;
      if (fields.text) {
        md5sum = crypto.createHash('md5');
        md5sum = md5sum.update(fields.text).digest('hex');
        file_id = md5sum + "." + fields.type;
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
        file_title = path.basename(file_name, path.extname(file_name));
        file_mime = files.file.mime;
      }
      draggables[file_id] = { name: file_name,
                              mime: file_mime,
                              title: file_title,
                              top: 200,
                              left: 350 };
      addEvent("add", { id: drag_id, info: draggables[drag_id] });
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
  var title = drag.title || drag.name || 'Title not set';
  var content;
  var mime_type = drag.mime.split("/");
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
             '<h2><span class="title">' + title + '</span>' +
                  '<div class="delete">X</div>' +
             '</h2>' + content + '<div class="comments"></div>' +
           '</div>');
});

// The position save controller: access through AJAX request by the main
// page for committing position changes of the draggables to the database,
// i.e. the global state.
app.post('/draggables/:id', function(req, res) {
  var drag = draggables[req.params.id];
  if (req.body.title) {
    // It's a title update!
    console.log("Title update for draggable " + req.params.id + ": " +
                req.body.title);
    drag.title = req.body.title;
    addEvent("title update", { id: req.params.id, title: req.body.title });
    res.send(req.body.title);
  }
  else {
    // Set the position for the file with the given ID.
    console.log("Position update for draggable " + req.params.id + ";" +
                " left: " + req.body.left +
                " top: " + req.body.top);
    drag.top = req.body.top;
    drag.left = req.body.left;
    addEvent("reposition", { id: req.params.id, top: drag.top, left: drag.left });
  }
});

// Draggable removal controller: removes the specific draggable from the
// database.
app.del('/draggables/:id', function(req, res) {
  var file_id = req.params.id;
  fs.unlink("public/upload/" + file_id, function(err) {
    if (err) {
      console.log("Something went wrong while deleting " +
                  file_id + ": " + err);
      res.send(err);
      throw err;
    }
    delete draggables[drag_id];
    console.log("Deleted draggable " + drag_id);
    addEvent("delete", { id: req.params.id });
    res.send(true);
  });
});

// Signal handling.
process.on('SIGINT', function() { db.save(draggables); process.exit(0); });
process.on('SIGTERM', function() { db.save(draggables); process.exit(0); });

// Start the application.
app.listen(3300);
console.log('Plemp! started on http://127.0.0.1:%d/ in %s mode',
            app.address().port, app.settings.env);
