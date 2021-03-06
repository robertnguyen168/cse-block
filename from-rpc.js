'use strict'
const Transaction = require('cse-tx')
const util = require('cse-util')
const Block = require('./')
const blockHeaderFromRpc = require('./header-from-rpc')

module.exports = blockFromRpc

/**
 * Creates a new block object from CSE JSON RPC.
 * @param {Object} blockParams - CSE JSON RPC of block (getBlockByNumber)
 * @param {Array.<Object>} Optional list of CSE JSON RPC of uncles (getUncleByBlockHashAndIndex)
 */
function blockFromRpc (blockParams, uncles) {
  uncles = uncles || []
  const block = new Block({
    transactions: [],
    uncleHeaders: []
  })
  block.header = blockHeaderFromRpc(blockParams)

  block.transactions = (blockParams.transactions || []).map(function (_txParams) {
    const txParams = normalizeTxParams(_txParams)
    // override from address
    const fromAddress = util.toBuffer(txParams.from)
    delete txParams.from
    const tx = new Transaction(txParams)
    tx._from = fromAddress
    tx.getSenderAddress = function () { return fromAddress }
    // override hash
    const txHash = util.toBuffer(txParams.hash)
    tx.hash = function () { return txHash }
    return tx
  })
  block.uncleHeaders = uncles.map(function (uncleParams) {
    return blockHeaderFromRpc(uncleParams)
  })

  return block
}

function normalizeTxParams (_txParams) {
  const txParams = Object.assign({}, _txParams)
  txParams.gasLimit = (txParams.gasLimit === undefined) ? txParams.gas : txParams.gasLimit
  txParams.data = (txParams.data === undefined) ? txParams.input : txParams.data
  // strict byte length checking
  txParams.to = txParams.to ? util.setLengthLeft(util.toBuffer(txParams.to), 20) : null
  // v as raw signature value {0,1}
  txParams.v = txParams.v < 27 ? txParams.v + 27 : txParams.v
  return txParams
}
