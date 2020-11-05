const socket = io.connect('/');

//Redirect to main page if user is already logged in
socket.emit('checkLoggedIn', function(loggedIn) {
    if(loggedIn) {
        window.location.href = '/';
    }
});

//Listener and function for registration
document.getElementById('register').addEventListener('click', register);

function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const password_confirm = document.getElementById('password_confirm').value;
    socket.emit('register', {email: email, password: password, password_confirm: password_confirm}, (callback) => {
        M.toast({html: callback});
    });
}