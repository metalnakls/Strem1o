const { ipcRenderer } = require("electron");

ipcRenderer.on("forward-escape-key", () => {
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

	const keyupEvent = new KeyboardEvent("keyup", commonEventProps);
	window.dispatchEvent(keyupEvent);
});
