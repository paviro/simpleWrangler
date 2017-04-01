// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const drivelist = require('drivelist');
var {ipcRenderer, remote} = require('electron'); 

drivelist.list((error, drives) => {
	if (error) {
		throw error;
	}
	
	drives.forEach((drive) => {
			if (drive.system == false){
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

var active_source = {"object": null, "path":null}
var active_destinations = []
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

	function destination_click(element) {
	    if (element.target.classList.contains("active")){
	    	element.target.classList.remove("active")
	    	active_destinations.remove(this.id)
	    } else {
	    	element.target.classList.add("active");
	    	active_destinations.push(this.id)
	    }
	};
	
	function sources_click(element) {
	    if ( element.target.classList.contains("active") ){
	    	element.target.classList.remove("active");
	    	active_source["object"] = null;
	    	active_source["path"] = null;
	    } else {
	    	if ( active_source["object"] ){
	    	active_source["object"].classList.remove("active");
	    	}
	    	element.target.classList.add("active");
	    	active_source["object"] = this;
	    	active_source["path"] = this.id;
	    }
	};
	
	function start_copy() {
		ipcRenderer.send('copyFiles', [active_source["path"], active_destinations] );
	}
	
	button = document.getElementById("copy_data");
	button.addEventListener("click", start_copy);