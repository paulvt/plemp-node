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
    var type = data.mime.split("/")[0];
    this.draggable({ stack: ".draggable",
                     containment: "window",
                     cancel: "audio, video",
                     distance: 10,
                     stop: update_drag_info })
        .click(raise_draggable);
    // Make it resizable with parameters based on the type:
    // FIXME: is there a better way than repeating the common options?
    switch(type) {
      case "image":
      case "video":
        this.resizable({ distance: 10,
                         start: raise_draggable,
                         stop: update_drag_info,
                         handles: "se",
                         minHeight: 250,
                         aspectRatio: true });
        break;
      case "audio":
        this.resizable({ distance: 10,
                         start: raise_draggable,
                         stop: update_drag_info,
                         handles: "e",
                         minWidth: 300 });
        break;
      case "text":
      case "application":
        this.resizable({ distance: 10,
                         start: raise_draggable,
                         stop: update_drag_info,
                         handles: "se",
                         minWidth: 300,
                         minHeight: 150,
                         alsoResize: "#" + this.attr("id") + " pre" });
    }
    // Configure events for child elements.
    this.find(".download").click({ id: this.attr("id") }, download_draggable);
    this.find(".delete").click({ id: this.attr("id") }, confirm_delete_draggable);
    this.find(".title").editable('draggables/' + this.attr("id"),
                                 { tooltip: "Click to edit…",
                                   name: 'title',
                                   submit: 'OK',
                                   cancel: 'Cancel',
                                   style: 'inherit' });
    // FIXME: actually get the comments!
    //this.find(".comments").text("Comments (0)");
    // Fix the height of the pre block.  FIXME: can this be improved?
    this.find("pre").css({ height: (this.height() - 50) + "px" });
    // Highlight contained code in the pre block.
    this.find("pre code").each(function(idx, elem) {
      hljs.highlightBlock(elem, '  ');
    });
    return $(this);
  };

  // Set up the dialogs.
  $("#add_dialog").dialog({ autoOpen: false,
                            width: "auto",
                            show: "fade",
                            hide: "fade",
                            resizable: false,
                            modal: true,
                            close: clear_add_dialog_form,
                            buttons: { "Cancel":  hide_add_dialog,
                                       "Upload!": function() {
                                         $("#add_form")[0].submit();
                                       }}});
  $("#delete_confirm").dialog({ autoOpen: false,
                                show: "fade",
                                hide: "fade",
                                resizable: false,
                                buttons: { "Cancel": function() {
                                             $(this).dialog("close");
                                           },
                                           "Delete": function() {
                                             $(this).dialog("close");
                                             delete_draggable($(this).data("id"));
                                           }}});

  // For drag & drop file uploading via the filedrop jQuery plugin and HTML5.
  $("body").filedrop({ url: '/draggables',
                       paramname: 'file',
                       data: { type: 'dnd' },
                       maxfiles: 1,
                       maxfilesize: 50,
                       error: handle_filedrop_error
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

// Clear the form of the add dialog.
function clear_add_dialog_form() {
  $("#add_form")[0].reset();
}

// Show the add dialog with a visual effect.
function show_add_dialog() {
  $("#add_dialog").dialog("open");
}

// Hide the add dialog with a visual effect and reset the form when finished.
function hide_add_dialog() {
  $("#add_dialog").dialog("close");
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
    $(this).remove();
  });
}

// Confirm the deletion of the draggable using the confirm dialog.
function confirm_delete_draggable(event) {
  event.preventDefault();
  $("#delete_confirm").data("id", event.data.id)
                      .dialog("open");
}

// Deletion has been confirmed, delete the draggable from the server and
// then the canvas.
function delete_draggable(drag_id) {
  $.post("draggables/" + drag_id, {"_method": "delete"}, function(data) {
    if (data) delete_draggable_from_canvas(drag_id);
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
  if (ui.size) {
    $.post("draggables/" + ui.helper.context.id, ui.size, "json");
  }
  else {
    $.post("draggables/" + ui.helper.context.id, ui.position, "json");
  }
}

// Poll for server events via AJAX.
function poll_server(timestamp) {
  $.ajax({ url: "events?timestamp=" + timestamp,
           success: handle_server_event,
           error: function() { poll_server(timestamp) }, // FIXME; handle properly!
           dataType: "json", timeout: 60000 });
};

// Handle server events.
function handle_server_event(event) {
  var drag = $("#draggables #" + event.data.id);
  switch(event.type) {
    case "reposition":
      drag.animate({ top: event.data.top, left: event.data.left });
      break;
    case "resize":
      drag.animate({ width: event.data.width, height: event.data.height })
          // Fix the height of the pre.  FIXME: can this be improved?
          .find("pre").animate({ height: event.data.height - 50 });
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

// Handle filedrop (drag & drop uploading) errors.
function handle_filedrop_error(err, file) {
  switch(err) {
    case 'BrowserNotSupported':
        flash_message("Your browser does not support drag & drop! " +
                       "Please click this button to upload:");
        break;
    case 'TooManyFiles':
        // user uploaded more than 'maxfiles'
        flash_message("You can only upload a single file at once!");
        break;
    case 'FileTooLarge':
        // program encountered a file whose size is greater than 'maxfilesize'
        // FileTooLarge also has access to the file which was too large
        // use file.name to reference the filename of the culprit file
        flash_message("The file is too large! " +
                      "Ensure it is smaller than than 50MB.");
        break;
    default:
        console.log(err, file);
        break;
  }
}

// Flash some messsage.
function flash_message(msg) {
  $("#message").html(msg)
  $("#message").fadeIn('slow').delay(5000).fadeOut('fast');
}

// Set some messsage (permanent version of flash_message).
function set_message(msg) {
  $("#message").html(msg)
  $("#message").fadeIn('slow');
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
