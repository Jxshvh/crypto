//Initiate required libraries
const express = require('express');
const util = require('util');
const session = require("express-session")({
    secret: "test",
    resave: true,
    saveUninitialized: true
})

const request = require('request');

const sharedsession = require("express-socket.io-session")
    url = require('url')
    app = express()
    http = require('http').Server(app)
    io = require('socket.io')(http)
    bcrypt = require('bcrypt')
    saltRounds = 10
    port = process.env.PORT || 4000;

//Database config
const mysql = require('mysql')
    config = {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'cryptomania'
    },
    conn = getDb(config);

//Needed for page and file handling
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(__dirname + '/view'));
app.use(session);

//Set template engine
app.set('view engine', 'pug');
app.set('views','./view');

//Page request handlers
app.get('/', (req, res) => {
    res.render('main', {title: 'Overview'});
});

app.get('/login', (req, res) => {
    res.render('login', {title: 'Login'});
});

app.get('/register', (req, res) => {
    res.render('register', {title: 'Register'});
});

app.get('/news', (req, res) => {
    res.render('news', {title: 'News'});
});

app.get('/portfolio', (req, res) => {
    res.render('portfolio', {title: 'Portfolio'});
});

http.listen(port, () => {console.log('Server on port: ' + port);});

//Initiate Socket.io + session
io.use(sharedsession(session));
const main = io.of('/');

main.on('connection', (socket) => {
    //Get cryptocurrency information
    socket.on('getAllCrypto', async (sortOption, callback) => {
        try {
            let coinData = await getRequest('?limit=2000');
            if(sortOption != 'noSort') {
                coinData = coinData.sort(getSort(sortOption));
            }
            callback(coinData);
        } catch (err) {
            throw new Error(err);
        }
    });

    //Get currency details such as price history and basic details
    socket.on('getCryptoDetails', async (id, callback) => {
        try {
            const basicInfo = await getRequest(id);
            const priceHistory = await getRequest(id + '/history?interval=d1');
            callback({basicInfo, priceHistory});
        } catch (err) {
            throw new Error(err);
        }
    });

    //Get all portfolio data of a user
    socket.on('getPortfolio',  async(callback) => {
        const user_id = socket.handshake.session.userdata.id;

        try {
            const portfolio = await conn.query(`SELECT * FROM portfolio WHERE user_id='${user_id}'`);

            for(let i = 0; i < portfolio.length; i++) {
                let coinData = await getRequest(portfolio[i].coin_id);
                portfolio[i].price = coinData.priceUsd;
                portfolio[i].name = coinData.name;
                portfolio[i].symbol = coinData.symbol;
            }

            callback(portfolio);
        } catch (err) {
            throw new Error(err);
        }
    });

    //Adds a currency to portfolio
    socket.on('addToPortfolio', async (id, callback) => {
        const user_id = socket.handshake.session.userdata.id;

        try {
            const coinCheck = await conn.query(`SELECT * FROM portfolio WHERE user_id='${user_id}' AND coin_id='${id}'`);

            if (coinCheck.length == 0) {
                await conn.query(`INSERT INTO portfolio(coin_id, user_id) VALUES('${id}', '${user_id}')`);
                callback('Selected Coin has been added to your portfolio.');
            } else {
                callback('Selected Coin is already in your portfolio');
            }
        } catch (err) {
            throw new Error(err);
        }
    });

    //Updates a user's portfolio currency amount
    socket.on('updateCurrencyAmount', async (data, callback) => {
        const user_id = socket.handshake.session.userdata.id;
        const coin_id = data.id;
        const amount = data.amount;

        await conn.query(`UPDATE portfolio SET amount='${amount}' WHERE coin_id='${coin_id}' AND user_id=${user_id}`);
        callback('Amount successfully updated');
    });

    //Removes a currency from user's portfolio
    socket.on('removeFromPortfolio', async (coin_id, callback) => {
        const user_id = socket.handshake.session.userdata.id;
        await conn.query(`DELETE FROM portfolio WHERE coin_id='${coin_id}' AND user_id='${user_id}'`);
        callback('Currency has been removed successfully');
    });

    //Return crypto news from news API
    socket.on('getCryptoNews', async (callback) => {
        const news = await getCryptoNews();
        callback(news.articles);
    });

    //Register a new user account
    socket.on('register', async (data, callback) => {
        const email = data.email,
        password = data.password,
        password_confirm = data.password_confirm;

        const userCheck = await conn.query(`SELECT email FROM users WHERE email='${email}'`);

        if(userCheck.length == 0) {
            if(password == password_confirm) {
                const passwordHash = await getHash(password);
                await conn.query(`INSERT INTO users(email, password) VALUES('${email}', '${passwordHash}')`);
                callback('User successfully registered');
            } else {
                callback('Passwords don\'t match');
            }
        } else {
            callback('Email already registered');
        }
    });

    //Log in user
    socket.on('login', async (data, callback) => {
        const email = data.email;
        const password = data.password;

        const userSelect = await conn.query(`SELECT * FROM users WHERE email='${email}'`);

        if(userSelect.length > 0) {
            const dbhash = userSelect[0].password,
                dbemail = userSelect[0].email,
                dbid = userSelect[0].id;

            const passwordCompare = await getHashCompare(password, dbhash);

            if(passwordCompare) {
                socket.handshake.session.userdata = {email: dbemail, id: dbid};
                socket.handshake.session.save();

                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });

    //Checks if client is logged in
    socket.on('checkLoggedIn', async (callback) => {
        if(!socket.handshake.session.userdata) {
            callback(false);
        } else {
            callback(true);
        }
    });

    //Log out user
    socket.on('logout', () => {//Destroy user session
        if (socket.handshake.session.userdata) {
            delete socket.handshake.session.userdata;
            socket.handshake.session.save();
        }
    });
});

/**
 * Run DB query or close DB connection. Uses promises.
 * @param config Database configuration
 * @returns {{query(*=, *=): *, close(): *}|*}
 */
function getDb( config ) {
    const connection = mysql.createConnection( config );
    return {
        query(sql, args) {
            return util.promisify(connection.query).call(connection, sql, args);
        },
        close() {
            return util.promisify(connection.end).call(connection);
        }
    };
}

/**
 * Sort cryptocurrency data array based on given options
 * @param options Contains sort order[asc/desc] and attribute name to sort
 * @returns {function(*, *): number}
 */
function getSort(options) {
    const sortOrder = options.split('-')[1];
    const attribute = options.split('-')[0];

    if(sortOrder == 'asc') {
        return function (a, b) {
            if (a[attribute] > b[attribute]) {
                return 1;
            } else if (a[attribute] < b[attribute]) {
                return -1;
            }
            return 0;
        }
    } else {
        return function (a, b) {
            if (a[attribute] < b[attribute]) {
                return 1;
            } else if (a[attribute] > b[attribute]) {
                return -1;
            }
            return 0;
        }
    }
}

/**
 * Returns 'crypto' tagged news articles from news API
 * @returns {Promise<unknown>}
 */
function getCryptoNews() {
    return new Promise((resolve, reject) => {
        const url = 'hide_apikey';

        request(url, (error, response, body) => {
            if (error) throw new Error(error);

            const parsed = JSON.parse(body);
            resolve(parsed);
        });
    });
}

/**
 * Return data from API request
 * @param name URL parameter options
 * @returns {Promise<Parsed JSON data>}
 */
function getRequest(name = '') {
    return new Promise((resolve, reject) => {
        request(getApiOptions(name), function(error, response, body) {
            if (error) throw new Error(error);

            let parsed = JSON.parse(body);
            resolve(parsed.data);
        });
    });
}

/**
 * Generates password hash from given plain text
 * @param password
 * @returns {Promise<Hashed password>}
 */
function getHash(password) {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, saltRounds, function(err, hash) {
            if (err) throw new Error(err);
            resolve(hash);
        });
    });
}

/**
 * Compares user password to DB password, returns true/false accordingly
 * @param password User input
 * @param dbhash Password in database
 * @returns {Promise<Boolean>}
 */
function getHashCompare(password, dbhash) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(password, dbhash, (err, res) => {
            if (err) throw err;

            if(res) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

/**
 * Creates URL with given parameter options
 * @param name Parameter options
 * @returns {{headers: {}, method: string, url: string}}
 */
function getApiOptions(name = false) {
    let url = 'https://api.coincap.io/v2/assets';

    if(name) {
        url = 'https://api.coincap.io/v2/assets/' + name;
    }

    return {
        'method': 'GET',
        'url': url,
        'headers': {
        }
    };
}