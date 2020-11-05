const socket = io.connect('/');
//All columns in cryptocurrency collection table
let allColumns = [];

let loadLimit = 15;
let currentCount = 0;
let cryptoData;
let cryptoDataFiltered = [];

//Redirect to login page if user is not logged in
socket.emit('checkLoggedIn', function(loggedIn) {
    if(!loggedIn) {
        window.location.href = '/login';
    }
});

/**
 * Detect page scroll end for infinite loading
 */
document.addEventListener('scroll', () => {
    const scrollHeight = document.body.scrollHeight - document.body.clientHeight;
    const scrollPos = document.body.scrollTop;
    //Value to compensate for possibly inaccurate scroll values
    const scrollOffset = 25;

    if(scrollPos >= (scrollHeight - scrollOffset)) {
        currentCount += loadLimit;
        displayCrypto();
    }
});

socket.emit('getAllCrypto', 'noSort', function(crypto) {
    cryptoData = crypto;
    displayCrypto();
});

/**
 * Add eventlisteners to table headers for sorting
 */
document.querySelectorAll('th').forEach(th => {
    th.addEventListener('click', applySort);
});

/**
 * Return new collection of cryptocurrencies with filter applied
 */
function applySort() {
    const sortOrder = this.classList[0];
    const id = this.children[0].id;
    const sortOption = id + '-' + sortOrder;

    //Set icon for ascending/descending based on selection
    if(sortOrder == 'asc') {
        this.classList.remove('asc');
        this.classList.add('desc');
        this.children[0].innerHTML = 'v';
    } else {
        this.classList.remove('desc');
        this.classList.add('asc');
        this.children[0].innerHTML = '^';
    }

    //Hide sort options in columns that aren't sorted anymore
    document.querySelectorAll('.sortIcon').forEach(icon => {
       if(icon.id != id) {
           icon.innerHTML = '';
       }
    });

    //Retrieve and display crypto list
    socket.emit('getAllCrypto', sortOption , function(crypto) {
        cryptoData = crypto;
        document.getElementById('cryptoDiv').innerHTML = '';
        currentCount = 0;
        displayCrypto();
    });
}

//Listener for name filter search
document.getElementById('filter').addEventListener('change', applyFilter);

/**
 * Apply filter for currency name
 */
function applyFilter() {
    const filterValue = this.value.toLowerCase();
    //First get all cryptocurrencies
    socket.emit('getAllCrypto', 'noSort', function(crypto) {
        cryptoData = crypto;
        document.getElementById('cryptoDiv').innerHTML = '';
        currentCount = 0;

        //Check crypto data for filter name value and add to array
        if(filterValue != '') {
            for (let i = 0; i < cryptoData.length; i++) {
                if (cryptoData[i].name.toLowerCase().includes(filterValue)) {
                    cryptoDataFiltered.push(cryptoData[i]);
                }
            }
            //Set filter array as main array
            cryptoData = cryptoDataFiltered;
        }
        //Display filtered data
        displayCrypto();
    });
}

/**
 * Opens window with cryptocurrency information
 */
function openModal() {
    const modal_element = document.querySelectorAll('.modal');
    M.Modal.init(modal_element, {});

    //Retrieve details and display them
    socket.emit('getCryptoDetails', this.id, function(data) {
        displayDetails(data.basicInfo, data.priceHistory);
    });
}

/**
 * Display details of selected currency
 * @param crypto Cryprocurrency object
 * @param res Price history
 */
function displayDetails(crypto, res) {
    //Set basic info
    document.getElementById('modal_header').innerHTML = crypto.name + ' (' + crypto.symbol + ')';
    document.getElementById('current_price').innerHTML = crypto.priceUsd;
    document.getElementById('market_cap').innerHTML = crypto.marketCapUsd;
    document.getElementById('volume').innerHTML = crypto.volumeUsd24Hr;
    document.getElementById('supply').innerHTML = crypto.supply;

    //Generate price history array for: every month except first and last one of retrieved data.
    //This is done to make sure the array only contains full months

    const temp = [];
    const keys = [];
    for(let i = 0; i < res.length; i++) {
        let date_formatted = res[i].date.split('-')[0] + '-' + res[i].date.split('-')[1];
        if(!temp[date_formatted]) {
            temp[date_formatted] = [];
            keys.push(date_formatted);
        }
        temp[date_formatted].push(res[i].priceUsd);
    }

    const values_final = [];

    let counter = 0;
    for(let i = 1; i < keys.length-1; i++) {
        for(let x = 0; x < temp[keys[i]].length; x++) {
            counter += Math.round(temp[keys[i]][x]);

            if(x == temp[keys[i]].length - 1) {
                values_final.push(Math.round(counter / temp[keys[i]].length))
                counter = 0;
            }
        }
    }

    //Remove first and last month from price history
    keys.pop();
    keys.shift();

    //Display price history chart
    const ctx = document.getElementById('myChart').getContext('2d');
    const myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: keys,
            datasets: [{
                label: 'Currency Value Past 23 Months',
                data: values_final,
                backgroundColor: [
                    '#7c4dff', '#b388ff', '#311b92', '#4527a0', '#512da8', '#5e35b1', '#673ab7',
                    '#7e57c2', '#9575cd', '#b39ddb', '#d1c4e9', '#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2',
                    '#673ab7', '#5e35b1', '#512da8', '#4527a0', '#311b92', '#b388ff', '#7c4dff'
                ]
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        }
    });
}

/**
 * Display cryptocurrency table
 */
function displayCrypto() {
    const mainDiv = document.getElementById('cryptoDiv');

    for(let i = currentCount; i < currentCount + loadLimit; i++) {
        if(cryptoData[i]) {//Check if index exists in cryptocurrency array
            let row = document.createElement('tr');

            row.appendChild(createCol(cryptoData[i].rank));

            //Currency icon image/symbol
            const symbol = document.createElement('td');
            const symbolContent = document.createElement('img');
            symbolContent.src = '../asset/img/icon/' + cryptoData[i].symbol + '.png';
            symbolContent.alt = "";
            symbol.appendChild(symbolContent);
            row.appendChild(symbol);

            row.appendChild(createCol(cryptoData[i].name + ' (' + cryptoData[i].symbol + ')'));
            row.appendChild(createCol(cryptoData[i].marketCapUsd));
            row.appendChild(createCol(cryptoData[i].priceUsd));
            row.appendChild(createCol(cryptoData[i].changePercent24Hr, true));

            //Add 'Show' + 'Add to portfolio' action buttons

            const actions = document.createElement('td');

            const detailContent = document.createElement('a');
            detailContent.innerHTML = 'Show';
            detailContent.classList.add('waves-effect', 'waves-light', 'btn-small', 'modal-trigger');
            detailContent.href = '#modal1';
            detailContent.id = cryptoData[i].id;
            detailContent.addEventListener('click', openModal);

            const add = document.createElement('a');
            add.innerHTML = '+ Portfolio';
            add.classList.add('waves-effect', 'waves-light', 'btn-small', 'modal-trigger', 'indigo', 'lighten-3');
            add.id = 'p' + cryptoData[i].id;
            add.addEventListener('click', addToPortfolio);

            actions.appendChild(detailContent);
            actions.appendChild(add);

            row.appendChild(actions);
            mainDiv.appendChild(row);
        }
    }

    //Increase current count for infinite loader and append created rows to table
    currentCount += 10;
    document.getElementById('progressBar').classList.add('noDisplay');
    allColumns = mainDiv.children;
}

/**
 * Add cryptocurrency to user's portfolio
 */
function addToPortfolio() {
    const id = this.id.substring(1);
    socket.emit('addToPortfolio', id, function(callback) {
        M.toast({html: callback});
    });
}

/**
 * Creates and returns new table column
 * @param data The data to be displayed
 * @param percentage If column has percentage value
 * @returns {HTMLTableDataCellElement} Column
 */
function createCol(data, percentage = false) {
    const col = document.createElement('td');
    col.innerHTML = data;

    //If number has percentage, add css class to add green/red colour accordingly
    if(percentage && data) {
        if(data.startsWith('-')) {
            col.classList.add('negativePercentage');
        } else {
            col.classList.add('positivePercentage');
        }
    }

    return col;
}

document.addEventListener('DOMContentLoaded', function() {
    const sidenav_element = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav_element, {});
});

//Listeners and function for logout
document.getElementById('logout').addEventListener('click', logout);
document.getElementById('logout_mobile').addEventListener('click', logout);

function logout() {
    socket.emit('logout');
    window.location.href = '/login';
}