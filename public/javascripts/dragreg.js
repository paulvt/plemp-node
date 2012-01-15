$(document).ready(function() {
  // Handlers for showing/hiding the upload dialog via buttons & keys.
  $("#add").click(show_add_dialog);
  $("#add_form #cancel").click(hide_add_dialog);
  if ($.browser.mozilla) {
    $(document).keypress(key_handler);
  }
  else {
    $(document).keyup(key_handler);
  }

  // Populate the canvas with the draggables.
  $.get("draggables", function(data) {
    var last_drag;
    $.each(data, function(key, val) {
       $.get("draggables/" + key, function(data) {
         $("#draggables").append(data);
         // Assume we have appended one draggable here:
         last_drag = $(".draggable").last();
         last_drag.draggable({ stack: ".draggable",
                               containment: "window",
                               stop: update_drag_info });
         last_drag.find(".delete").click({ id: last_drag[0].id,
                                           element: last_drag },
                                           delete_draggable);
         last_drag.find(".title").editable('draggables/' + last_drag[0].id,
                                           { tooltip: "Click to edit…",
                                             name: 'title',
                                             submit: 'OK',
                                             cancel: 'Discard',
                                             style: 'inherit' });
         // Highlight contained code.
         last_drag.find("pre code").each(function(idx, elem) {
           hljs.highlightBlock(elem, '  ');
         });
       })
    })
  }, "json");
});

// Callback functions.
function show_add_dialog() {
  $('#add_dialog').fadeIn('slow');
}

function hide_add_dialog() {
  $("#add_dialog").fadeOut('fast', function() {
    $("#add_form")[0].reset();
  });
}

function delete_draggable(event) {
  drag_id = event.data.id
  $.post("draggables/" + drag_id, {"_method": "delete"}, function(data) {
    if (data)
      event.data.element.remove();
  }, "json");
}

function update_title(content, foo) {
  console.log(foo);
}

function update_drag_info(event, ui) {
  $.post("draggables/" + ui.helper.context.id, ui.position, "json");
}

function key_handler(event) {
  switch (event.keyCode) {
    case 27: /* Escape */
      hide_add_dialog();
      break;
    case 16: /* Plus */
    case 187: /* Plus (numpad) */
      show_add_dialog();
      break;
  }
}
