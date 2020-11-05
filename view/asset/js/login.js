const socket = io.connect('/');

//Redirect to main page if user is already logged in
socket.emit('checkLoggedIn', function(loggedIn) {
    if(loggedIn) {
        window.location.href = '/';
    }
});

document.getElementById('login').addEventListener('click', login);

//User login action, redirect to main page or display error.
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    socket.emit('login', {email: email, password: password}, (callback) => {
        if(callback) {
            window.location.href = '/';
        } else {
            M.toast({html: 'Incorrect credentials.'});
        }
    });
}