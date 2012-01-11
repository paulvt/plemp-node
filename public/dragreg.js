$(document).ready(function() {
  $("#add").click(show_add_dialog);
  $("#add_form #cancel").click(hide_add_dialog);

  $.get("current", function(data) {
    $.each(data, function(key, val) {
       $.get("draggable/" + key, function(data) {
         $("#draggables").append(data);
         $(".draggable").draggable({ stack: "#draggables img",
                                     stop: update_drag_info });
       })
    })
  }, "json");
});

function show_add_dialog() {
  $('#add_dialog').fadeIn('slow');
};

function hide_add_dialog() {
  $("#add_dialog").fadeOut('fast', function() {
    $("#add_form")[0].reset();
  });
};

function update_drag_info(event, ui) {
  $.post("savepos/" + event.srcElement.id, ui.position, "json");
}
