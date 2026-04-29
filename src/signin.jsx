import { useState } from "react";
import "./App.css";

function Signin({ darkMode, toggleTheme }) {

    function handleSignin() {
        fetch("http://localhost:3000/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
            .then(res => res.json()
                .then(data => {
                    if (data.success) {
                        alert("User registered successfully!");
                    } else {
                        alert("Registration failed: " + data.message);
                    }
                }));
    }
    const [username, setusername] = useState("");
    const [password, setpassword] = useState("");
    return (
        <div className={darkMode ? 'dark-log' : 'light-log'}>
            <div className="main">
                <div className="loghome">
                    <button
                        className="them"
                        onClick={() => toggleTheme()}
                    >
                        {darkMode ? "☀︎" : "⏾"}
                    </button>

                    <div className="container">
                        <h1>Signin</h1>
                        <label htmlFor="email">Email</label>
                        <input type="text" name="Email" placeholder="Username" value={username} onChange={(e) => setusername(e.target.value)} />
                        <label htmlFor="password">Password</label>
                        <input type="password" name="Password" placeholder="Password" value={password} onChange={(e) => setpassword(e.target.value)} />
                        <button onClick={handleSignin}>Signin</button>
                        <a className="newacc" href="/login">Alreday have an account?</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default Signin;