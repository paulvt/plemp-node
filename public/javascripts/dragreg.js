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
    $.each(data, function(key, val) {
       $.get("draggables/" + key, function(data) {
         $("#draggables").append(data);
         $(".draggable").draggable({ stack: ".draggable",
                                     containment: "window",
                                     stop: update_drag_info });
         // FIXME: highlight text for now, until we can determine and
         // store what everything exactly is.
         $("pre code").each(function(idx, elem) {
           hljs.highlightBlock(elem, '  ');
         });
       })
    })
  }, "json");
});

// Callback functions.
function show_add_dialog() {
  $('#add_dialog').fadeIn('slow');
};

function hide_add_dialog() {
  $("#add_dialog").fadeOut('fast', function() {
    $("#add_form")[0].reset();
  });
};

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
