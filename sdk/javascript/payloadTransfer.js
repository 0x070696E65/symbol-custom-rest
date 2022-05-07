const newXym = require("./src/index.js");
const { sha3_256 } = require('js-sha3');
const request = require('request');
const node = "http://154.53.40.175:3000"
// const node = "http://sym-test-01.opening-line.jp:3000"

const facade = new newXym.facade.SymbolFacade("testnet");
//const key = new newXym.CryptoTypes.PrivateKey("10F55A7326C36220004AB58AE37F23B6366EFF521108D2C7F25820D3B9FA037B")
const key = new newXym.CryptoTypes.PrivateKey("64DFB09F7C99424C0B9924577778D1FABE48FA45EE2283FDBE84D5A4C3C6F2F6")

const now = Date.now();
const eadj = 1573430400;
const deadline = BigInt(now - eadj*1000 + 60*60*6*1000)

const transaction = facade.transactionFactory.create({
    type: 'transferv_transaction',
    signerPublicKey: '9C410FFA9BBD009DBB27478BED178567D54B5EF5BAE475F35139B54E944B4409',
    fee: 1000000n,
    deadline: deadline,
    recipientAddress: 'TAEVDDC5TXMJ5ICMRZ6A52DT6NYCQ7U3MBODEWA',
    // mosaics: [
    //   { mosaicId: 0x38E1C1C590120CB6n, amount: 1000000n }
    // ]
});
const signature = facade.signTransaction(new newXym.facade.SymbolFacade.KeyPair(key), transaction);
const jsonPayload = facade.transactionFactory.constructor.attachSignature(transaction, signature);
console.log(jsonPayload);
anounceTX(JSON.parse(jsonPayload).payload);
const payload = stringToUint8Array(JSON.parse(jsonPayload).payload);
const sig = payload.slice(8,8+64);
const pub = payload.slice(8+64,8+64+32)
const gene = stringToUint8Array("BF7493C7B84DDBA853AE96C40C87CADDB73CA552CA842627156A015927622A3A");
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

