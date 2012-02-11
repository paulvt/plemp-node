$(document).ready(function() {
  // Handlers for showing/hiding the upload dialog via clicks & keys.
  $("#add").click(show_add_dialog);
  $("#add_form #cancel").click(hide_add_dialog);
  if ($.browser.mozilla) {
    $(document).keypress(key_handler);
  }
  else {
    $(document).keyup(key_handler);
  }

  // The plempable jQuery plugin containing most of the Plemp! UI
  // functionality.
  $.fn.plempable = function(data) {
    this.draggable({ stack: ".draggable",
                     containment: "window",
                     cancel: "audio, video",
                     distance: 10,
                     stop: update_drag_info })
        .click(raise_draggable)
        .hover(function() { $(this).find(".comments").fadeIn(); },
               function() { $(this).find(".comments").fadeOut(); });
    this.find(".delete").click({ id: this.attr("id"),
                                 element: this }, delete_draggable);
    this.find(".download").click({ id: this.attr("id") }, download_draggable);
    this.find(".title").editable('draggables/' + this.attr("id"),
                                 { tooltip: "Click to edit…",
                                   name: 'title',
                                   submit: 'OK',
                                   cancel: 'Cancel',
                                   style: 'inherit' });
    // FIXME: actually get the comments!
    this.find(".comments").text("Comments (0)").hide();
    // Highlight contained code.
    this.find("pre code").each(function(idx, elem) {
      hljs.highlightBlock(elem, '  ');
    });
    return $(this);
  };

  // For drag & drop file uploading via the filedrop jQuery plugin and HTML5.
  $("body").filedrop({ url: '/draggables', 
                       paramname: 'file',
                       data: { type: 'dnd' },
                       maxfiles: 1,
                       maxfilesize: 50,
                       error: function(err, file) { console.log(err, file); }
                     });

  // Populate the canvas with the draggables.
  $.get("draggables", function(data) {
    var timestamp = data.timestamp;

    // Retrieve each draggable from the list and add it to the canvas.
    $.each(data.list, function(drag_id, drag_info) {
      add_draggable_to_canvas(drag_id, drag_info);
    });

    // Start a (long-poll) loop for update events from the server.
    poll_server(timestamp);
  }, "json");
});

// Callback functions

// Show the add dialog with a visual effect.
function show_add_dialog() {
  $('#add_dialog').fadeIn('slow');
}

// Hide the add dialog with a visual effect and reset the form when finished.
function hide_add_dialog() {
  $("#add_dialog").fadeOut('fast', function() {
    $("#add_form")[0].reset();
  });
}

// Add a draggable element to the canvas.
function add_draggable_to_canvas(drag_id, drag_info) {
   $.get("draggables/" + drag_id, function(data) {
     $("#draggables").append(data);
     // Assume we have appended a signle draggable here:
     $(".draggable").last().plempable(drag_info).fadeIn('slow');
   });
}

// Delete a draggable element from the canvas.
function delete_draggable_from_canvas(drag_id) {
  $("#draggables #" + drag_id).hide('fade', 'slow', function() {
    element.remove();
  });
}

// Delete a draggable on the server.
function delete_draggable(event) {
  drag_id = event.data.id;
  $.post("draggables/" + drag_id, {"_method": "delete"}, function(data) {
    if (data) {
      delete_draggable_from_canvas(drag_id);
    }
  }, "json");
}

// Download a draggable from the server.
function download_draggable(event) {
  event.preventDefault();
  window.open("download/" + event.data.id);
}

// Raise the draggable to the foreground.
function raise_draggable(event) {
  var max = 0;
  $(".draggable").each(function() {
    var cur = parseFloat($(this).css("z-index"));
    max = cur > max ? cur : max;
  });
  $(this).css("z-index", max + 1);
}

// Update the position of a draggable on the server.
function update_drag_info(event, ui) {
  $.post("draggables/" + ui.helper.context.id, ui.position, "json");
}

// Poll for server events via AJAX.
function poll_server(timestamp) {
  $.ajax({ url: "events?timestamp=" + timestamp,
           success: handle_server_event,
           error: function() { poll_server(timestamp) }, // FIXME; handle properly!
           dataType: "json", timeout: 60000 });
};

// Handle server events {
function handle_server_event(event) {
  switch(event.type) {
    case "reposition":
      $("#draggables #" + event.data.id).animate({ top: event.data.top,
                                                   left: event.data.left });
      break;
    case "title update":
      $("#draggables #" + event.data.id + " h2 .title").text(event.data.title);
      break;
    case "add":
      add_draggable_to_canvas(event.data.id, event.data.info);
      break;
    case "delete":
      delete_draggable_from_canvas(event.data.id);
      break;
    default:
      console.log("Unsupported event type!");
      console.log(event);
  }
  poll_server(event.timestamp);
}

// Handle the Escape and Plus keys for hiding/showing the add dialog.
function key_handler(event) {
  switch (event.keyCode) {
    case 27: /* Escape */
      hide_add_dialog();
      break;
    case 187: /* Plus (numpad) */
      show_add_dialog();
      break;
  }
}
