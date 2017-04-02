// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const drivelist = require('drivelist');
var {
	ipcRenderer,
	remote
} = require('electron');

//Disable zooming
require('electron').webFrame.setZoomLevelLimits(1, 1);

const swal = require('sweetalert2');
var ProgressBar = require('progressbar.js');

var bar = new ProgressBar.Line(document.getElementById("progress_bar"), {
	easing: 'easeInOut',
	duration: 100,
	color: '#FFEA82',
	svgStyle: {
		width: '100%',
		height: '100%'
	},
	text: {
		style: {
			value: 'Starting file transfer...',
		},
		className: 'progress_text',
		autoStyle: false,
		autoStyleContainer: false
	}
});

var fs = require('fs');

//Add OSX Menubar when on OSX
if (process.platform == "darwin") {
	var menuBar = document.createElement("div")
	menuBar.id = "menuBar"
	document.body.appendChild(menuBar);
};

drivelist.list((error, drives) => {
	if (error) {
		throw error;
	}

	drives.forEach((drive) => {
		if (drive.system == false) {
			drive.mountpoints.forEach((mountpoint) => {
				table = document.getElementById("sources");
				row = table.insertRow(0);
				cell = row.insertCell(0);
				cell.innerHTML = drive.description + "<br>" + mountpoint.path;
				cell.id = mountpoint.path
				cell.addEventListener("click", sources_click);
			})
		};
		drive.mountpoints.forEach((mountpoint) => {
			table = document.getElementById("destination");
			row = table.insertRow(0);
			cell = row.insertCell(0);
			cell.innerHTML = drive.description + "<br>" + mountpoint.path;
			cell.id = mountpoint.path
			cell.addEventListener("click", destination_click);
		})


	});

});

var active_source = {
	"object": null,
	"path": null
}
var active_destinations = []
Array.prototype.remove = function () {
	var what, a = arguments,
		L = a.length,
		ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};

function destination_click() {
	if (active_source.path === this.id) {
		swal(
			'Invalid Destination',
			'You have already chosen this disk as your source!',
			'error'
		)
	} else {
		if (this.classList.contains("active")) {
			this.classList.remove("active")
			active_destinations.remove(this.id)
		} else {
			this.classList.add("active");
			active_destinations.push(this.id)
		}
	}
};

function sources_click() {
	if (active_destinations.includes(this.id)) {
		swal(
			'Invalid Source',
			'You have already chosen this disk as your destination!',
			'error'
		)
	} else {
		if (this.classList.contains("active")) {
			this.classList.remove("active");
			active_source["object"] = null;
			active_source["path"] = null;
		} else {
			if (active_source["object"]) {
				active_source["object"].classList.remove("active");
			}
			this.classList.add("active");
			active_source["object"] = this;
			active_source["path"] = this.id;
		}
	}
};

function start_copy() {
	connected = true

	// Check if source has been selected
	if (active_source.path === null) {
		swal(
			'No Source',
			'You have not selected a data source yet!',
			'error'
		)
		connected = false;
		// Check if destination has been selected
	} else if (active_destinations.length === 0) {
		swal(
			'No Destination',
			'You have not selected a data destination yet!',
			'error'
		)
		connected = false;
		// Both selected, check if available
	} else {
		// Is source ok?
		if (!fs.existsSync(active_source.path)) {
			swal(
				'Source Not Valid',
				'Please double check if your source is correctly connected!',
				'error'
			)
			connected = false;
			// Is destination ok?
		} else {
			active_destinations.forEach((destination) => {
				if (!fs.existsSync(destination)) {
					swal(
						'Destination Not Valid',
						'Please double check if your destination is correctly connected!',
						'error'
					)
					connected = false;
				}
			})
		}
	}

	if (connected) {
		ipcRenderer.send('copyFiles', [active_source["path"], active_destinations]);
		document.getElementById("copy_ui").style.display = 'none';
		bar.set(0)
		document.getElementById("progress_bar").style.display = 'unset';
	}
}

ipcRenderer.on('done', (event, arg) => {
	setTimeout(function () {
		document.getElementById("progress_bar").style.display = 'none';
		document.getElementById("copy_ui").style.display = 'flex';
		swal(
			'Files Copied',
			'Your files have been copied successfully!',
			'success'
		)
	}, 1000);
});

ipcRenderer.on('percentage', (event, payload) => {
	bar.set(payload.percentage / 100);
	if (payload.state == "copy") {
		bar.setText("Transfering Files<br>" + Math.round(payload.percentage) + ' %');
	} else {
		bar.setText("Verify Files<br>" + Math.round(payload.percentage) + ' %');
	}

});

button = document.getElementById("copy_data");
button.addEventListener("click", start_copy);