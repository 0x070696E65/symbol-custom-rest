const newXym = require("./src/index.js");
const { sha3_256 } = require('js-sha3');
const request = require('request');
const node = "http://154.53.40.175:3000"
// const node = "http://sym-test-01.opening-line.jp:3000"

const facade = new newXym.facade.SymbolFacade("testnet");
//const key = new newXym.CryptoTypes.PrivateKey("10F55A7326C36220004AB58AE37F23B6366EFF521108D2C7F25820D3B9FA037B")
const key = new newXym.CryptoTypes.PrivateKey("EB7289F7FA85FBD03EEEF12649F974D30406138B32554D2A0FE751B4540768E9")

const now = Date.now();
const eadj = 1573430400;
const deadline = BigInt(now - eadj*1000 + 60*60*6*1000)

const transaction = facade.transactionFactory.create({
    type: 'transferv_transaction',
    signerPublicKey: '9A13A413A61F4370AC14220B56CC10193905FAFBE14FA275E4BD4253338A22DC',
    fee: 10000000n,
    deadline: deadline,
    recipientAddress: 'TC4GURS2RYATUCL2H6QRED754IKRH7PHTRMFPLI',
    mosaics: [
      { mosaicId: 0x2EF4723BC702E027n, amount: 1n }
    ]
});
const signature = facade.signTransaction(new newXym.facade.SymbolFacade.KeyPair(key), transaction);
const jsonPayload = facade.transactionFactory.constructor.attachSignature(transaction, signature);
console.log(jsonPayload);
anounceTX(JSON.parse(jsonPayload).payload);
const payload = stringToUint8Array(JSON.parse(jsonPayload).payload);
const sig = payload.slice(8,8+64);
const pub = payload.slice(8+64,8+64+32)
const gene = stringToUint8Array("75293B03BA4C927517E78B1220181A7592C22B31EFAB34A3DF88CFEB6DF4641B");
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
    // console.log(response);
    console.log(body);
  });

}

