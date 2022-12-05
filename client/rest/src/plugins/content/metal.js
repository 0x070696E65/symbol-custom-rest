const bs58 = require('bs58');

const Nibble_To_Char_Map = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
const METAL_ID_HEADER_HEX = '0B2A';

const uint8ToHex = input => {
	let s = '';
	for (const byte of input) {
		s += Nibble_To_Char_Map[byte >> 4];
		s += Nibble_To_Char_Map[byte & 0x0f];
	}
	return s;
};

export const restoreMetadataHash = metalId => {
	const hashHex = uint8ToHex(bs58.decode(metalId));
	if (!hashHex.startsWith(METAL_ID_HEADER_HEX))
		throw Error('Invalid metal ID.');

	return hashHex.slice(METAL_ID_HEADER_HEX.length);
};

const metadatasByCompositeHash = (ids, db) => {
	const compositeHashes = ids.map(id => Buffer.from(id));
	const conditions = { 'metadataEntry.compositeHash': { $in: compositeHashes } };
	const collection = db.database.collection('metadata');
	return collection.find(conditions)
		.sort({ _id: -1 })
		.toArray()
		.then(entities => Promise.resolve(db.sanitizer.renameIds(entities)));
};

export const getFirstChunk = async (metalId, db) => metadatasByCompositeHash(restoreMetadataHash(metalId), db);
