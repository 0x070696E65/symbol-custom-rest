//'use strict';
const newXym = require("./src/index.js");
const { sha3_256 } = require('js-sha3');
const request = require('request');

// const WebSocket = require('ws');
const node = "http://154.12.242.37:3000"
var networkGenerationHash ='';
var epochAdjustment = '';
const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const facade = new newXym.facade.SymbolFacade("testnet");
const key = new newXym.CryptoTypes.PrivateKey("CE9559C44BF6BD5136C6491A5FFD6D9E5839924F9AE489450CF2BC1A1C40593C")

const now = Date.now();
const eadj = 1637848847;
const deadline = BigInt(now - eadj*1000 + 60*60*5*1000)

const transaction = facade.transactionFactory.create({
    type: 'transfer_transaction',
    signerPublicKey: 'CBCBFCD07813A55368AE02E36A8C8D016D50D8DEE5C34BC4D805E8873EC93073',
    fee: 100000n,
    deadline: deadline,
    recipientAddress: 'TAEVDDC5TXMJ5ICMRZ6A52DT6NYCQ7U3MBODEWA',
    // mosaics: [{
    //     mosaicId: 0x3A8416DB2D53B6C8n,
    //     amount: 1000000n
    // }]
});
const signature = facade.signTransaction(new newXym.facade.SymbolFacade.KeyPair(key), transaction);
console.log(key)
console.log(transaction)
console.log(signature)
console.log(facade.verifyTransaction(transaction,signature))
const jsonPayload = facade.transactionFactory.constructor.attachSignature(transaction, signature);
console.log(jsonPayload);
//anounceTX(JSON.parse(jsonPayload).payload);
console.log(JSON.parse(jsonPayload).payload.length/2)
const payload = stringToUint8Array(JSON.parse(jsonPayload).payload);
console.log(payload.slice(0,100))
console.log(payload.slice(100,))
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
console.log(uint8ToString(hash))

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
    // uri: "http://sym-test-01.opening-line.jp:3000/transactions",
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

