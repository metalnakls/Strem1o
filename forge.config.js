const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const path = require("path");
const { spawnSync } = require("child_process");
const fs = require("fs");

module.exports = {
	packagerConfig: {
		asar: true,
		extraResource: [
			"./stremio-service-build/stremio-service", // Binary will be placed here by the hook
		],
	},
	rebuildConfig: {},
	makers: [
		{
			name: "@electron-forge/maker-squirrel",
			config: {},
		},
		{
			name: "@electron-forge/maker-zip",
			platforms: ["darwin"],
		},
		{
			name: "@electron-forge/maker-deb",
			config: {},
		},
		{
			name: "@electron-forge/maker-rpm",
			config: {},
		},
	],
	plugins: [
		{
			name: "@electron-forge/plugin-auto-unpack-natives",
			config: {},
		},
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
	hooks: {
		packageAfterCopy: async (
			forgeConfig,
			buildPath,
			electronVersion,
			platform,
			arch
		) => {
			console.log(`Hook: packageAfterCopy for ${platform}-${arch}`);
			const projectRoot = forgeConfig.dir || process.cwd();
			const stremioServiceDir = path.join(projectRoot, "stremio-service");
			const cargoTomlPath = path.join(stremioServiceDir, "Cargo.toml");

			let rustTarget;
			if (platform === "darwin") {
				if (arch === "arm64") {
					rustTarget = "aarch64-apple-darwin";
				} else if (arch === "x64") {
					rustTarget = "x86_64-apple-darwin";
				}
			}
			// TODO: Add mappings for other platforms/architectures if you plan to build for them (e.g., Windows, Linux)

			if (!rustTarget) {
				console.warn(
					`Hook: Unsupported platform/arch for stremio-service build: ${platform}/${arch}.`
				);
				throw new Error(
					`Unsupported target for stremio-service build: ${platform}-${arch}. Please extend the hook in forge.config.js.`
				);
			}

			console.log(`Hook: Checking/installing Rust target ${rustTarget}`);
			const checkTargetResult = spawnSync(
				"rustup",
				["target", "list", "--installed"],
				{
					stdio: "pipe",
					encoding: "utf-8",
				}
			);
			if (
				checkTargetResult.error ||
				checkTargetResult.status !== 0 ||
				(checkTargetResult.stdout &&
					!checkTargetResult.stdout.includes(rustTarget))
			) {
				console.log(
					`Hook: Rust target ${rustTarget} not installed. Attempting to install...`
				);
				const installTargetResult = spawnSync(
					"rustup",
					["target", "add", rustTarget],
					{
						stdio: "inherit",
					}
				);
				if (installTargetResult.status !== 0) {
					throw new Error(`Hook: Failed to install Rust target ${rustTarget}.`);
				}
			} else {
				console.log(`Hook: Rust target ${rustTarget} is already installed.`);
			}

			console.log(
				`Hook: Building stremio-service for target ${rustTarget} from ${stremioServiceDir}`
			);
			const cargoArgs = [
				"build",
				"--release",
				"--target",
				rustTarget,
				"--manifest-path",
				cargoTomlPath,
			];

			const buildResult = spawnSync("cargo", cargoArgs, {
				cwd: projectRoot, // cargo needs to resolve paths relative to Cargo.toml if not in stremioServiceDir, but manifest-path handles it.
				stdio: "inherit",
			});

			if (buildResult.status !== 0) {
				throw new Error(
					`Hook: stremio-service build failed for target ${rustTarget}. Exit code: ${buildResult.status}`
				);
			}

			const builtBinaryPath = path.join(
				stremioServiceDir,
				"target",
				rustTarget,
				"release",
				"stremio-service"
			);
			const destinationDir = path.join(projectRoot, "stremio-service-build");
			const destinationPath = path.join(destinationDir, "stremio-service");

			if (!fs.existsSync(builtBinaryPath)) {
				throw new Error(
					`Hook: Built stremio-service binary not found at ${builtBinaryPath}`
				);
			}

			console.log(
				`Hook: Ensuring destination directory exists: ${destinationDir}`
			);
			fs.mkdirSync(destinationDir, { recursive: true });

			console.log(`Hook: Copying ${builtBinaryPath} to ${destinationPath}`);
			fs.copyFileSync(builtBinaryPath, destinationPath);
			fs.chmodSync(destinationPath, 0o755); // Ensure it's executable

			console.log(
				`Hook: stremio-service successfully built and copied for ${rustTarget}.`
			);
		},
	},
};
