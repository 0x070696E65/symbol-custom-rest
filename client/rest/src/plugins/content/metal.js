const bs58 = require('bs58');

const Nibble_To_Char_Map = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const METAL_ID_HEADER_HEX = '0B2A';

const metal = {
	uint8ToHex(input) {
		let s = '';
		for (const byte of input) {
			s += Nibble_To_Char_Map[byte >> 4];
			s += Nibble_To_Char_Map[byte & 0x0f];
		}
		return s;
	},

	restoreMetadataHash(metalId) {
		const hashHex = this.uint8ToHex(bs58.decode(metalId));
		if (!hashHex.startsWith(METAL_ID_HEADER_HEX))
			throw Error('Invalid metal ID.');

		return hashHex.slice(METAL_ID_HEADER_HEX.length);
	}
};

module.exports = metal;
