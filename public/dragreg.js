$(document).ready(function() {
  $("#add").click(show_add_dialog);
  $("#add_form #cancel").click(hide_add_dialog);
});

function show_add_dialog() {
  $('#add_dialog').show(1);
};

function hide_add_dialog() {
  $("#add_dialog").hide(.5, function() {
    $("#add_form")[0].reset();
  });
};
