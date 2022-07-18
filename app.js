const express = require('express')
const routes = require('./routes/algo.js')
const bodyParser = require('body-parser');
const app = express()

const host = '127.0.0.1'
const port = 7000

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', routes)
app.use(function(req,res) {
    res.send({status: 400, massege: "Bad Request"});
})

app.listen(port, host, () =>
  console.log(`Server listens http://${host}:${port}`)
)