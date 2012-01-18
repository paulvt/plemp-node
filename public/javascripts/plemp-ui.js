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
                                 element: this },
                               delete_draggable);
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
  };

  // For drag & drop file uploading via the filedrop jQuery plugin and HTML5.
  $("body").filedrop({ url: '/draggables', 
                       paramname: 'file',
                       data: { type: 'dnd' },
                       maxfiles: 1,
                       maxfilesize: 50,
                       error: function(err, file) { console.log(err, file); },
                       afterAll: function() { window.location.reload(true) }
                     });

  // Populate the canvas with the draggables.
  $.get("draggables", function(data) {
    $.each(data, function(drag_id, drag_info) {
       $.get("draggables/" + drag_id, function(data) {
         $("#draggables").append(data);
         // Assume we have appended one draggable here:
         $(".draggable").last().plempable(drag_info);
       });
    });
  }, "json");
});

// Callback functions.

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

// Delete a draggable on the server; remove it with a visual effect.
function delete_draggable(event) {
  drag_id = event.data.id;
  $.post("draggables/" + drag_id, {"_method": "delete"}, function(data) {
    if (data) {
      event.data.element.hide('fade', 'slow', function() {
        event.data.element.remove () });
    }
  }, "json");
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
