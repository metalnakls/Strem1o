const { spawn } = require("child_process");
const { app, BrowserWindow, screen } = require("electron");

const child = spawn(
	"Stremio_Runtime/StremioService.app/Contents/MacOS/stremio-service",
	[],
	{
		shell: true,
	}
);

child.stdout.on("data", (data) => {
	console.log(`stdout: ${data}`);
});

child.stderr.on("data", (data) => {
	console.error(`stderr: ${data}`);
});

child.on("close", (code) => {
	console.log(`child process exited with code ${code}`);
});

const CreateWindow = () => {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize;
	const win = new BrowserWindow({
		width: Math.round(width * 0.8),
		height: Math.round(height * 0.8),
		webPreferences: {
			nodeIntegration: true,
		},
		icon: "img/stremio.icns",
	});
	win.loadURL("https://web.stremio.com");
};

app.whenReady().then(CreateWindow);

app.on("before-quit", () => {
	child.kill();
});
