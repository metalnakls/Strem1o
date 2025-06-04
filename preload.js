const { ipcRenderer } = require("electron");

let lastProcessedTime = 0;
const debounceTime = 200;
ipcRenderer.on("forward-escape-key", () => {
	const now = Date.now();
	if (now - lastProcessedTime < debounceTime) {
		return;
	}
	lastProcessedTime = now;

	const commonEventProps = {
		key: "Backspace",
		code: "Backspace",
		keyCode: 8,
		which: 8,
		bubbles: true,
		cancelable: true,
		composed: true,
	};

	const keydownEvent = new KeyboardEvent("keydown", commonEventProps);
	window.dispatchEvent(keydownEvent);
});
