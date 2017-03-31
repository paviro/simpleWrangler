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

copy_directory("/Volumes/Daten/Benutzer/paulvincentroll/Movies/Action Essentials/20. Textures", ["Dest1", "dest2"])