const express = require('express')
const routes = require('./routes/algo.js')
const bodyParser = require('body-parser');
const app = express()

const port = 8000
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', routes)
app.use(function(req,res) {
    res.status(400).send({status: 400, massege: "Bad Request"});
})

app.listen(port, () =>
  console.log(`Server listens http://localhost:${port}`)
)