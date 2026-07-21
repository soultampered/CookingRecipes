import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'ca.stokpot.app',
	appName: 'Stokpot',
	webDir: 'build',
	plugins: {
		SplashScreen: {
			launchAutoHide: false,
			backgroundColor: '#172420',
			showSpinner: false
		}
	}
};

export default config;
