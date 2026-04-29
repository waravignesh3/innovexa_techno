import { useState } from "react";
import "./App.css";
import { ReactTyped } from "react-typed";

function Login({ darkMode, toggleTheme }) {
    const [username, setusername] = useState("");
    const [password, setpassword] = useState("");

    function handleLogin() {
        fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Login successful!");
                } else {
                    alert("Login failed: " + data.message);
                }
            });
    }

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
                        <h1>Login</h1>
                        <label htmlFor="email">Email</label>
                        <input type="email" name="Email" placeholder="Username" required value={username} onChange={(e) => setusername(e.target.value)} />
                        <label htmlFor="password">Password</label>
                        <input type="password" name="Password" placeholder="Password" required value={password} onChange={(e) => setpassword(e.target.value)} />
                        <button onClick={handleLogin} >Login</button>
                        <a className="newacc" href="/signin">
                            don't have an account?
                        </a>
                    </div>

                </div>
                <div id="inform">
                    <h2>
                        <ReactTyped
                            strings={["Innovex Technologies", "Fast and Reliable Solutions", "Transforming Ideas into Reality", "Your Trusted Tech Partner"]}
                            typeSpeed={50}
                            backSpeed={30}
                            loop
                            showCursor={true}
                            CursorChar="|"
                        />
                    </h2>
                </div>
            </div>
        </div>
    )
}
export default Login;