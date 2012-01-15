var fs = require("fs")
  , path = require("path")
  , db_file = "./draggables.json";

// Saves the draggables info object to the database file (synchronously).
function save(obj) {
  console.log("Saved the database to " + db_file);
  console.dir(obj);
  fs.writeFileSync(db_file, JSON.stringify(obj));
}

// Loads the draggables info object from the database file.
function load() {
  if (path.existsSync(db_file)) {
    var json_string = fs.readFileSync(db_file);
  }
  else {
    // If the database file does not exist, return a new, empty object.
    return {};
  }

  try {
    var obj = JSON.parse(json_string);
    console.log("Loaded the database from " + db_file);
    console.dir(obj);
    return obj;
  }
  catch (exception) {
    console.error("There was an error parsing the database file: ", exception);
    process.exit(1);
  }
}

exports.save = save
exports.load = load
