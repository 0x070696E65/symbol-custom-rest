const newXym = require("./src/index");
const { sha3_256 } = require('js-sha3');
const request = require('request');
const converter = require("./src/utils/converter");

// const node = "http://154.12.242.37:3000"
const node = "http://2.dusan.gq:3000"

const facade = new newXym.facade.SymbolFacade("testnet");
const key = new newXym.CryptoTypes.PrivateKey("6CE865E22B947239AC01FFD0140ECA04F2B179D812CF568119BAA95CF420A767")
const account = new newXym.facade.SymbolFacade.KeyPair(key);
const signerPublicKey = Buffer.from(account.publicKey.bytes).toString("hex").toUpperCase();

const now = Date.now();
const eadj = 1637848847;
const deadline = BigInt(now - eadj*1000 + 60*60*6*1000 - 60*1000);//deadlineを導出

const mosaicRentalFee = 50;

const feeMultiPlier = 100;

const nonce = Math.floor( Math.random() * (99999999 + 1 - 1) ) + 1;

const emMosaicDefi = facade.transactionFactory.createEmbedded({
    type: 'mosaic_definition_transaction',
	  signerPublicKey: signerPublicKey,
		duration: 0n,
		flags: 15,//1:転送可能,2:供給可変,4:制限,8没収
    nonce:nonce
});

const emMosaicSupply = facade.transactionFactory.createEmbedded({
    type: 'mosaic_supply_change_transaction',
    signerPublicKey: signerPublicKey,
		mosaicId: BigInt(emMosaicDefi.id),
		delta: 100n,
		action: 1
});

const aggregateComplete = facade.transactionFactory.create({
	type: 'aggregate_complete_transaction',
	signerPublicKey: signerPublicKey,
	deadline: deadline,
  transactions: [emMosaicDefi,emMosaicSupply]
});

aggregateComplete.fee.value = BigInt((aggregateComplete.size + mosaicRentalFee) * feeMultiPlier ); //SetMaxFeeの役割を果たします

console.log(aggregateComplete)
const signature = facade.signTransaction(new newXym.facade.SymbolFacade.KeyPair(key), aggregateComplete);
const jsonPayload = facade.transactionFactory.constructor.attachSignature(aggregateComplete, signature);
console.log(jsonPayload);
anounceTX(JSON.parse(jsonPayload).payload);

const payload = stringToUint8Array(JSON.parse(jsonPayload).payload);
const sig = payload.slice(8,8+64);
const pub = payload.slice(8+64,8+64+32)
const gene = stringToUint8Array("7FCCD304802016BEBBCD342A332F91FF1F3BB5E902988B352697BE245F48E836");
const tx = payload.slice(8 + 64 + 32 + 4);
const hasher = sha3_256.create();
hasher.update(sig);
hasher.update(pub);
hasher.update(gene);
hasher.update(tx);
const hash = new Uint8Array(hasher.arrayBuffer())
console.log(node +"/transactionStatus/"+uint8ToString(hash))

function stringToUint8Array(str){
  const buf = Buffer.from(str,"hex");
  return bufferToUint8Array(buf);
}
function bufferToUint8Array(buf) {
  const view = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
  }
  return view;
}

function uint8ToString(uint8arr){
  return Buffer.from(uint8arr).toString("hex").toUpperCase();
}

function anounceTX(signed){
  console.log(node+"/transactions")
  var options = {
    uri: node+"/transactions",
  headers: {
    "Content-type": "application/json",
  },
  json: {
    "payload": signed
  }
  };
  request.put(options, function(error, response, body){
    console.log(body);
  });

}
