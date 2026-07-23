export type Mode = 'light' | 'dark';

export interface PaletteColors {
	ink: string;
	paper: string;
	line: string;
	accent: string;
}

export interface Palette {
	name: string;
	mood: string;
	light: PaletteColors;
	dark: PaletteColors;
}

// good/warn/bad stay fixed across every palette — only the neutral + accent colors change.
export const SEMANTIC: Record<Mode, { good: string; goodSoft: string; warn: string; warnSoft: string; bad: string; badSoft: string }> = {
	light: {
		good: '#4C6B3F',
		goodSoft: '#E7EEDF',
		warn: '#9C6A0E',
		warnSoft: '#F5E9D3',
		bad: '#A23629',
		badSoft: '#F5E1DE'
	},
	dark: {
		good: '#92C077',
		goodSoft: '#23301C',
		warn: '#E8B95C',
		warnSoft: '#3A2C15',
		bad: '#E28B7C',
		badSoft: '#3A211D'
	}
};

export const PALETTES: Palette[] = [
	{
		name: 'Terracotta & Sage',
		mood: 'Warm clay + herb — classic cookbook.',
		light: { ink: '#2B2420', paper: '#F2EBE1', line: '#E3D6C6', accent: '#C1592F' },
		dark: { ink: '#EFE6DC', paper: '#211A15', line: '#3A3128', accent: '#E08A5C' }
	},
	{
		name: 'Forest & Cream',
		mood: 'Farm-to-table green, earthy and grounded.',
		light: { ink: '#1E2A1F', paper: '#F4F0E4', line: '#DED7C4', accent: '#355E3B' },
		dark: { ink: '#E9EAE0', paper: '#161C16', line: '#2B322A', accent: '#6FA378' }
	},
	{
		name: 'Navy & Gold',
		mood: 'Ink-dark navy, a little more upscale.',
		light: { ink: '#182234', paper: '#F0EDE3', line: '#DAD6C9', accent: '#B8892E' },
		dark: { ink: '#E7E6E0', paper: '#121826', line: '#282F3E', accent: '#E0B25C' }
	},
	{
		name: 'Coral & Teal',
		mood: 'Playful and modern, brighter feel.',
		light: { ink: '#20302E', paper: '#F0F4F1', line: '#D6E0DC', accent: '#E8694A' },
		dark: { ink: '#E5EBE8', paper: '#141E1C', line: '#293530', accent: '#F2916F' }
	},
	{
		name: 'Charcoal & Amber',
		mood: 'Moody and minimal, warm amber pop.',
		light: { ink: '#241E17', paper: '#F3EEE6', line: '#E2D9CB', accent: '#B8792E' },
		dark: { ink: '#EDE7DD', paper: '#141311', line: '#332F28', accent: '#E0A85C' }
	},
	{
		name: 'Dusty Rose & Charcoal',
		mood: 'Soft contemporary blush.',
		light: { ink: '#2A2320', paper: '#F5EDEA', line: '#E6D8D4', accent: '#C77B84' },
		dark: { ink: '#EDE4E1', paper: '#1C1615', line: '#372C2A', accent: '#E39CA3' }
	},
	{
		name: 'Mustard & Denim',
		mood: 'Retro vintage kitchen.',
		light: { ink: '#202A38', paper: '#F2EEDF', line: '#E3DCC0', accent: '#C9A227' },
		dark: { ink: '#E6E9EE', paper: '#161C26', line: '#2C333F', accent: '#E0BE55' }
	},
	{
		name: 'Olive & Burnt Orange',
		mood: '70s-retro warmth.',
		light: { ink: '#262B1E', paper: '#F1EDDD', line: '#E1DBC0', accent: '#B85C2B' },
		dark: { ink: '#E8E7DA', paper: '#191C14', line: '#30332A', accent: '#E08B57' }
	},
	{
		name: 'Blush & Sage',
		mood: 'Soft pastel, cottagecore.',
		light: { ink: '#2A2C26', paper: '#F6F1EC', line: '#E7DED5', accent: '#C68FA0' },
		dark: { ink: '#E9E9E2', paper: '#1B1C18', line: '#34352F', accent: '#DBA9B7' }
	},
	{
		name: 'Slate Blue & Coral',
		mood: 'Modern app-y, tech-food-delivery feel.',
		light: { ink: '#232A3A', paper: '#F0EFEA', line: '#DBDAD1', accent: '#EA7860' },
		dark: { ink: '#E7E8EC', paper: '#171A26', line: '#2C303D', accent: '#F19E8A' }
	},
	{
		name: 'Cream & Burgundy',
		mood: 'Elegant wine tone.',
		light: { ink: '#241A1D', paper: '#F4EEE6', line: '#E4D7CE', accent: '#7A2E3B' },
		dark: { ink: '#EDE4E2', paper: '#1A1214', line: '#362A2C', accent: '#B3576A' }
	},
	{
		name: 'Mint & Charcoal',
		mood: 'Fresh and clean.',
		light: { ink: '#212623', paper: '#EFF4F1', line: '#D9E2DC', accent: '#3F9C7C' },
		dark: { ink: '#E6EBE8', paper: '#141816', line: '#2A3330', accent: '#67C4A2' }
	},
	{
		name: 'Butter & Espresso',
		mood: 'Cozy café warmth.',
		light: { ink: '#2C2018', paper: '#F7F0DD', line: '#EADFC0', accent: '#8A5A34' },
		dark: { ink: '#EDE6D8', paper: '#1C1712', line: '#362D22', accent: '#C68A54' }
	},
	{
		name: 'Ocean Teal & Sand',
		mood: 'Coastal Mediterranean.',
		light: { ink: '#1D2B2C', paper: '#F3EEE1', line: '#E1D9C4', accent: '#2C7A78' },
		dark: { ink: '#E6EAE9', paper: '#141D1D', line: '#293330', accent: '#5CA9A6' }
	},
	{
		name: 'Plum & Gold',
		mood: 'Jewel-tone, currently popular.',
		light: { ink: '#251C2A', paper: '#F3ECE9', line: '#E4D7D8', accent: '#7B3F73' },
		dark: { ink: '#EBE4EA', paper: '#1A1420', line: '#332B37', accent: '#B06CA6' }
	}
];

export const DEFAULT_PALETTE = 'Mint & Charcoal';
