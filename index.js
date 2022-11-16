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
        const bookingCollections = client.db('doctorsPortal').collection('bookingCollections');

        app.get("/appoinment-options", async(req, res) => {
            const query = {};
            const date = req.query.date;
            const options = await appoinmentOptionsCollection.find(query).toArray();
            const bookingQuery = {appoinmentDate: date};
            const alreadyBooked = await bookingCollections.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.Treatment === option.name);
                const bookedSlot = optionBooked.map(book => book.slot);
                const remainingSlots = option.slots.filter(slot => !bookedSlot.includes(slot))
                option.slots = remainingSlots;
            })
            res.send(options);
        });

        app.post('/bookings', async(req, res) => {
            const bookings = req.body;
            const query = {
                appoinmentDate: bookings.appoinmentDate,
                email: bookings.email,
                treatment: bookings.treatment
            }
            const alreadyBooked = await bookingCollections.find(query).toArray();
            if(alreadyBooked.length) {
                const message = `You have already booked`;
                return res.send({acknowledged: false, message})
            }
            const result = await bookingCollections.insertOne(bookings);
            res.send(result);
        } );
    }
    finally {

    }
}
run().catch(console.log);



app.listen(port, () => {
    console.log(`Port is running on ${port}`);
})