const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
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

function verifyJWT (req, res, next) {
    const authHeader = req.headers.authorization;
    if(!authHeader) {
        return res.status(401).json("Unauthorzed Access");
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function(err, decoded){

        if(err) {
            res.status(403).send({message: "Forbidden Access"})
        }
        req.decoded = decoded;
        next();
    }
    ) 
}

async function run() {
    try {
        const appoinmentOptionsCollection = client.db('doctorsPortal').collection('appoinmentOptions');
        const bookingCollections = client.db('doctorsPortal').collection('bookingCollections');
        const usersCollections = client.db('doctorsPortal').collection('users');

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

        app.get('/bookings', verifyJWT, async(req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (decodedEmail !== email) {
                return res.status(401).send({message: "Unauthorzed Access"})
            }
            const query = {email: email};
            const bookings = await bookingCollections.find(query).toArray();
            res.send(bookings);
        })

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

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const user = await usersCollections.findOne(query);
            if(user) {
                const token = jwt.sign({email},  process.env.ACCESS_TOKEN, {expiresIn: '1h'})
                return res.send({accessToken: token});
            }
            else{
                return res.status(403).send({accessToken: ""});
            }
        }),

        app.get('/users', async (req, res) =>{
            const query = {};
            const users = await usersCollections.find(query).toArray();
            res.send(users);
        });

        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollections.insertOne(user);
            res.send(result);
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollections.findOne(query);
            res.send({isAdmin: user?.role === "Admin"});
        })

        app.put('/users/admin/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const options = {upsert: true}
            const updatedDoc = {
                $set: {
                    role: "Admin"
                }
            }
            const result = await usersCollections.updateOne(query, updatedDoc, options);
            res.send(result);
        });
    }
    finally {

    }
}
run().catch(console.log);



app.listen(port, () => {
    console.log(`Port is running on ${port}`);
})