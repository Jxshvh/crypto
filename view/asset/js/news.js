const socket = io.connect('/');

//Redirect to login page if user is not logged in
socket.emit('checkLoggedIn', function(loggedIn) {
    if(!loggedIn) {
        window.location.href = '/login';
    }
});

//Retrieve and display crypto related news
socket.emit('getCryptoNews', (news) => {
    const mainDiv = document.getElementById('newsDiv');

    for(let i = 0; i < news.length; i++) {
        let row = document.createElement('tr');

        row.appendChild(createCol(news[i].title));
        row.appendChild(createCol(news[i].publishedAt.split('T')[0]));

        const url = document.createElement('a');
        url.innerHTML = 'View';
        url.classList.add('waves-effect',  'waves-light', 'btn-small', 'modal-trigger');
        url.href = news[i].url;
        url.target = '_blank';

        row.appendChild(url);

        mainDiv.appendChild(row);
    }
});

/**
 * Creates and returns new table column
 * @param data The data to be displayed
 * @param percentage If column has percentage value
 * @returns {HTMLTableDataCellElement}
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

//Listeners and function for logout
document.getElementById('logout').addEventListener('click', logout);
document.getElementById('logout_mobile').addEventListener('click', logout);

function logout() {
    socket.emit('logout');
    window.location.href = '/login';
}