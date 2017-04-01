const drivelist = require('drivelist');

drivelist.list((error, drives) => {
	if (error) {
		throw error;
	}
	
	drives.forEach((drive) => {
			if (drive.system == false){
				drive.mountpoints.forEach((mountpoint) => {
					console.log(drive.description);
					console.log(mountpoint.path);
				})
			}
	});
		
});