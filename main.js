const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain

const url = require('url')


// Wrangler
var recursive = require('recursive-readdir');
var XXHash = require('xxhash');
var fs = require('fs-extra');
const path = require('path')
var getSize = require('get-folder-size');


function copy_directory(source, destination) {
  // Get total size of files to copy
  getSize(source, function(err, bytesTotal) {
    // Set already copied bytes to zero
    let bytesCopied = 0
    // Gett all files to copy
    recursive(source, function(err, files) {
      // Function to copy files synchronous
      copyFile = function(x) {
        // If not all files have been copied:
        if (x < files.length) {
          // Open current file as data stream
          const readStream = fs.createReadStream(files[x])
          // On data:
          readStream.on('data', function(buffer) {
            // Add size of data chunck to bytesCopied
            bytesCopied += buffer.length
            // Calculate percentage of already copied data
            let percentage = ((bytesCopied / bytesTotal) * 100).toFixed(2)
            // Log percentage
            console.log(files[x] + ": " + percentage + '%')
          })
          // On end -> whole file read:
          readStream.on('end', function() {
            // continue to next one
            copyFile(x + 1);
          })
          // For every destination:
          for (var i = 0; i < destination.length; i++) {
            // Check if path exists and create if not
            ensureDirectoryExistence(destination[i] + files[x].slice(source.length))
            // Write data stream to file
            readStream.pipe(fs.createWriteStream(destination[i] + files[x].slice(source.length)));
          }
          // All files have been copied:
        } else {
          // validate copies
          validate_files(files, source, destination)
        }
      };
      // starts the copyFile function
      copyFile(0);
    });
  })
}

function validate_files(files, source, destination) {
  // Get all hashes
  get_hashs(files, source, destination, function(hashes) {
    // Setup stats variables
    valid_files = 0
    broken_files = 0
    // For source each file:
    for (var file in hashes["source"]) {
      // For each copy of the source file:
      for (var destination in hashes["destination"]) {
        // Compare source hash to copy hash
        // matching:
        if (hashes["source"][file] == hashes["destination"][destination][file]) {
          valid_files += 1
          //console.log(file + " copied correctly...");
        // Not matching:
        } else {
          broken_files += 1
          //console.log(file + " broken.");
        }
      }
    }
    // Log stats
    console.log(valid_files / Object.keys(hashes["destination"]).length + " out of " + Object.keys(hashes["source"]).length + " files are okay.")
  })
}

function get_hashs(files, source, destination, callback) {
  // Setup hashes dictionary
  hashes = {}
  hashes["destination"] = {}
  hashes["source"] = {}
  for (var i = 0; i < destination.length; i++) {
    hashes["destination"][destination[i]] = {}
  }
  // Get hash for every file:
  getHash = function(x) {
    // If we haven't calculated a hash for every file:
    if (x < files.length) {
      // Read source file
      file = fs.readFileSync(files[x]);
      // Calculate source hash
      source_hash = XXHash.hash(file, 0xCAFEBABE)
      // Store source hash
      hashes["source"][files[x].slice(source.length + 1)] = source_hash
      // For each copy of the source:
      for (var i = 0; i < destination.length; i++) {
        // Read copy
        file = fs.readFileSync(destination[i] + files[x].slice(source.length));
        // Calculate and store copy hash
        hashes["destination"][destination[i]][files[x].slice(source.length + 1)] = XXHash.hash(file, 0xCAFEBABE)
      }
      // Log current working hash
      console.log("current hash: " + source_hash + " - " + files[x].substring(files[x].lastIndexOf("/") + 1, files[x].length) )
      // continue to next file
      getHash(x + 1)
    // All hashes calculated
    } else {
      // execute callback
      callback(hashes)
    }
  }
  // start getHash function
  getHash(0)
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}




// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// Listen for sync message from renderer process
ipcMain.on('copyFiles', (event, arg) => {  
  // Print 3
  console.log(arg);
  copy_directory(arg[0], arg[1])
  // Send value synchronously back to renderer process
  event.returnValue = 4;
  // Send async message to renderer process
  mainWindow.webContents.send('ping', 5);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
