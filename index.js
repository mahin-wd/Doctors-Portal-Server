const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Doctors Portal server is running");
});


// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4lqljgn.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const appoinmentOptionsCollection = client.db('doctorsPortal').collection('appoinmentOptions');

        app.get("/appoinment-options", async(req, res) => {
            const query = {};
            const options = await appoinmentOptionsCollection.find(query).toArray();
            res.send(options);
        });
    }
    finally {

    }
}
run().catch(console.log);



app.listen(port, () => {
    console.log(`Port is running on ${port}`);
})