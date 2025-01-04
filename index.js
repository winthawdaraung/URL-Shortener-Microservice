require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require("dns");

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
const mongo_URI = process.env.mongo_URI;

mongoose.connect(mongo_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
    res.json({ greeting: 'hello API' });
});

// URL Shortener Schema and Model
const urlSchema = new mongoose.Schema({
    URL: String,
    shorturl: Number
});

const urlModel = mongoose.model("url", urlSchema);

// POST: Shorten URL
app.post("/api/shorturl", async (req, res) => {
    const originalUrl = req.body.url;

    try {
        const parsedUrl = new URL(originalUrl);

        dns.lookup(parsedUrl.hostname, async (err, address) => {
            if (err || !address) {
                return res.json({ error: 'invalid url' });
            }

            // Generate a new shorturl
            const urlCount = await urlModel.countDocuments({});
            const urlDoc = new urlModel({ URL: originalUrl, shorturl: urlCount + 1 });

            try {
                const savedDoc = await urlDoc.save();
                res.json({ original_url: savedDoc.URL, short_url: savedDoc.shorturl });
            } catch (saveError) {
                console.error("Database error:", saveError);
                res.status(500).json({ error: 'Database error' });
            }
        });
    } catch (error) {
        res.json({ error: 'invalid url' });
    }
});

// GET: Redirect to Original URL
app.get("/api/shorturl/:shorturl", async (req, res) => {
    const shorturl = req.params.shorturl;

    try {
        const urlDoc = await urlModel.findOne({ shorturl: shorturl });
        if (!urlDoc) {
            return res.json({ error: "URL not found!" });
        }
        res.redirect(urlDoc.URL);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});
