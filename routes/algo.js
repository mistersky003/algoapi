const express = require('express');
const jsonInfo = require('../modules/info.js');
const keys = require('../modules/keys.js');
const router = express.Router()
const axios = require('axios').default;
const algosdk = require('algosdk');

const baseServer = 'https://testnet-algorand.api.purestake.io/ps2'
const port = '';

router.get('/info', (req, res) => {
    res.status(200).send(jsonInfo);
});

/* Balance */
router.get('/algo', (req, res) => {
    let data = {status: 200, usd: "", btc: ""};
    axios.get('https://price.algoexplorerapi.io/price/algo-usd').then(
        (response) => {
            console.log(response.data.price);
            data.usd = response.data.price
            axios.get('https://price.algoexplorerapi.io/price/algo-btc').then(
                (response) => {
                    console.log(response.data.price);
                    data.btc = response.data.price
                    data.status = 200
                    res.status(200).send(data);
                },
                (error) => {
                    res.status(500).send({status: 500, error: error.message});
                }
            );
        },
        (error) => {
            res.status(500).send({status: 500, error: error.message});
        }
    );
});

/* Generate Phrase */ 
router.post('/generatePhrase', (req, res) => {
    if (req.body.seed_phrase) {
        try {  
            const account = algosdk.mnemonicToSecretKey(req.body.seed_phrase);
            console.log(account.addr);
            res.status(200).send({status: 200, address: account.addr});
        } catch (err) {
            console.log("err", err);
            res.status(500).send({status: 500, massege: err.message});
        }
    } else {
        res.status(400).send({status: 400, message: "Bad Request"});
    }
});

/* Valid Phrase */ 
router.get('/isValidAddress/:address', async (req, res) => {
    if (req.params.address) {
        if (algosdk.isValidAddress(req.params.address)) {
            try {
                const token = {
                    'X-API-Key': keys.getKey()
                }
                const algodClient = new algosdk.Algodv2(token, baseServer, port);
                let accountInfo = await algodClient.accountInformation(req.params.address).do();
                let min = 0.000001;
                if (accountInfo.amount == 0) {
                    min = 0.1;
                }
                res.status(200).send({status: 200, valid: true, minAmountForSend: min});
            } catch (err) {
                res.status(500).send({status: 500, message: err.message});
            }
        } else {
            res.status(200).send({status: 200, valid: false});
        }
    } else {
        res.status(400).send({status: 400, message: "Bad Request"});
    }
});

/* Balance */
router.get('/getBalance/:address', (req, res) => {
    if (req.params.address) {
        let resp = {status: 200, balance_algo_rounded: 0, balance_algo_full: 0, balance_usd: 0};
        axios.get('https://indexer.testnet.algoexplorerapi.io/v2/accounts/' + req.params.address).then(
            (response) => {
                let count = (response.data.account.amount/1000000).toString();
                resp.balance_algo_full = count;
                let l = count.toString().match(/\.(\d+)/)?.[1].length;
                if (l > 4) {
                    if (l == 5) {
                        resp.balance_algo_rounded = count.slice(0, count.length-1);
                    } else if (l == 6) {
                        resp.balance_algo_rounded = count.slice(0, count.length-2);
                    }
                } else {
                   resp.balance_algo_rounded = count;
                }
                axios.get('https://price.algoexplorerapi.io/price/algo-usd').then(
                    (response) => {
                        let usd = (response.data.price*resp.balance_algo_full).toFixed(4);
                        resp.balance_usd = usd;
                        resp.status = 200
                        res.status(200).send(resp);
                    },
                    (error) => {
                        res.status(500).send({status: 500, error: error.message});
                    }
                );  
            },
            (error) => {
                res.status(200).send(resp);
            }
        );
    } else {
        res.status(400).send({status: 400, message: "Bad Request"});
    }
});

/* getTransactions */ 
router.post('/transactions', (req, res) => {
    if (req.body.address) {
        let url = 'https://algoindexer.testnet.algoexplorerapi.io/v2/transactions?address=' + req.body.address;
        
        if (req.body.limit) {
            url += '&limit=' + req.body.limit;
        }
        if (req.body.next) {
            url += '&next=' + req.body.next;
        }
        if (req.body.role) {
            // sender, receiver
            url += '&address-role=' + req.body.role;
        }
        axios.get(url).then(
            (response) => {
                transactionSource = response.data.transactions;
                transactionsArray = [];
                for (let i=0; i<transactionSource.length; i++) {
                    let amountsource = (transactionSource[i]['payment-transaction']['amount'] / 1000000).toString();
                    let amount = amountsource;
                    let moreUrl = 'https://testnet.algoexplorer.io/tx/' + transactionSource[i].id;
                    transactionsArray.push({taxId: transactionSource[i].id, amount: amount, sender: transactionSource[i].sender, receiver: transactionSource[i]['payment-transaction']['receiver'], more: moreUrl});
                }
                res.status(200).send({status: 200, next: response.data['next-token'], transactions: transactionsArray});
            },
            (error) => {
                res.status(500).send({status: 500, error: error.message});
            }
        ); 
    } else {
        res.status(400).send({status: 400, message: "Bad Request"});
    }
});

router.get('/fee', async (req, res) => {
    try {
        const token = {
            'X-API-Key': keys.getKey()
        }
        const algodClient = new algosdk.Algodv2(token, baseServer, port);
        let params = await algodClient.getTransactionParams().do();
        params.fee = algosdk.ALGORAND_MIN_TX_FEE;
        params.flatFee = true;
        res.status(200).send({status: 200, fee: params.fee});
    } catch (err) {
        res.status(500).send({status: 500, message: err.message});
    }
});

router.post('/send', async (req, res) => {
    if (req.body.seed && req.body.amount && req.body.reciever) {
        try {  
            const account = algosdk.mnemonicToSecretKey(req.body.seed);
            var minAmount = 0.000001;
            if (algosdk.isValidAddress(req.body.reciever)) {
                const token = {
                    'X-API-Key': keys.getKey()
                }
                const algodClient = new algosdk.Algodv2(token, baseServer, port);
                let recAccount = await algodClient.accountInformation(req.body.reciever).do();
                let params = await algodClient.getTransactionParams().do();
                params.fee = algosdk.ALGORAND_MIN_TX_FEE;
                params.flatFee = true;
                if (recAccount.amount == 0) {
                    minAmount = 0.1
                }
                if (req.body.amount >= minAmount) {

                let balance = await axios.get('https://indexer.testnet.algoexplorerapi.io/v2/accounts/' + account.addr).then(
                        (response) => {
                            //let count = (response.data.account.amount/1000000); 
                            return response.data.account.amount;
                        },
                        (error) => {
                            return 0;
                        }
                    );
                    let sum = req.body.amount * 1000000;
                    sum += params.fee;
                    let total = balance - sum;
                    total /= 1000000;
                    if (total >= 0.1) {
                        try {

                            const receiver = req.body.reciever;
                            let amount = req.body.amount * 1000000;
                            let sender = account.addr;

                            let txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
                                from: sender, 
                                to: receiver, 
                                amount: amount, 
                                suggestedParams: params
                            });

                            let signedTxn = txn.signTxn(account.sk);
                            let txId = txn.txID().toString();
                            console.log("Signed transaction with txID: %s", txId);

                            await algodClient.sendRawTransaction(signedTxn).do();

                            // Wait for confirmation
                            let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
                            //Get the completed Transaction
                            /*console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
                            console.log("Transaction " + txId + " conf " + confirmedTxn);
                            console.log("Transaction Amount: %d microAlgos", confirmedTxn.txn.txn.amt);        
                            console.log("Transaction Fee: %d microAlgos", confirmedTxn.txn.txn.fee);*/

                            res.status(200).send({status: 200, message: "success"});

                       } catch (error) {
                            res.status(500).send({status: 200, message: "transaction error"});
                       }
                    } else {
                        res.status(500).send({status: 500, message: "insufficient funds on the balance"}); 
                    }
                } else {
                    res.status(500).send({status: 500, message: "The amount is below the minimum"});
                }
            } else {
                res.status(500).send({status: 500, message: "invalid recieve address"});
            }
        } catch (err) {
            res.status(500).send({status: 500, message: "invalid seed phrase"});
        }
    } else {
        res.status(400).send({status: 400, message: "Bad Request"});
    }

});


module.exports = router;