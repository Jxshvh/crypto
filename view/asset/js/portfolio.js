const socket = io.connect('/');

//Redirect to login page if user is not logged in
socket.emit('checkLoggedIn', function(loggedIn) {
   if(!loggedIn) {
      window.location.href = '/login';
   }
});

socket.emit('getPortfolio', function(portfolio) {
   displayPortfolio(portfolio);
});

/**
 * Display portfolio of user
 * @param portfolio Portfolio data
 */
function displayPortfolio(portfolio) {
   //Select and clear div
   const mainDiv = document.getElementById('portfolioDiv');
   mainDiv.innerHTML = '';

   for(let i = 0; i < portfolio.length; i++) {
      let row = document.createElement('tr');

      const symbol = document.createElement('td');
      const symbolContent = document.createElement('img');
      symbolContent.src = '../asset/img/icon/' + portfolio[i].symbol + '.png';
      symbolContent.alt = "";
      symbol.appendChild(symbolContent);
      row.appendChild(symbol);

      row.appendChild(createCol(portfolio[i].name + ' (' + portfolio[i].symbol + ')'));
      row.appendChild(createCol(portfolio[i].price));

      const amountColumn = document.createElement('td');
      const amountInput = document.createElement('input');
      amountInput.value = portfolio[i].amount;
      amountInput.id = 'a' + portfolio[i].coin_id;
      amountInput.addEventListener('change', updateAmount);

      amountColumn.appendChild(amountInput);
      row.appendChild(amountColumn);

      let totalWorth = (portfolio[i].price * portfolio[i].amount);
      row.appendChild(createCol(totalWorth));

      const actions = document.createElement('td');

      const remove = document.createElement('a');
      remove.innerHTML = '- Portfolio';
      remove.classList.add('waves-effect',  'waves-light', 'btn-small', 'modal-trigger', 'pink', 'darken-3');
      remove.id = portfolio[i].coin_id;
      remove.addEventListener('click', removeFromPortfolio);

      actions.appendChild(remove);

      row.appendChild(actions);
      mainDiv.appendChild(row);
   }
}

function removeFromPortfolio() {
   socket.emit('removeFromPortfolio', this.id, function(callback) {
      M.toast({html: callback});

      //Refresh portfolio
      socket.emit('getPortfolio', function(portfolio) {
         displayPortfolio(portfolio);
      });
   });
}

/**
 * Update cryptocurrency amount
 */
function updateAmount() {
   const id = this.id.substring(1);
   const amount = this.value;

   if(isNaN(amount)) {
      M.toast({html: 'Invalid number. please use dots instead of comma for decimals'});
   } else {
      socket.emit('updateCurrencyAmount', {id: id, amount: amount}, function(callback) {
         M.toast({html: callback});
         //Refresh portfolio
         socket.emit('getPortfolio', function(portfolio) {
            displayPortfolio(portfolio);
         });
      });
   }
}

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