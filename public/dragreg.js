$(document).ready(function() {
  $("#add").click(show_add_dialog);
  $("#add_form #cancel").click(hide_add_dialog);
});

function show_add_dialog() {
  $('#add_dialog').fadeIn('slow');
};

function hide_add_dialog() {
  $("#add_dialog").fadeOut('fast', function() {
    $("#add_form")[0].reset();
  });
};
