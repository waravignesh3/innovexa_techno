import { useState } from 'react'
import './App.css'
import Login from './login.jsx';
import Signin from './signin.jsx';
import logo from "./assets/Innovex_Logo.jpeg";
import { Routes, useNavigate, Route } from 'react-router-dom';


function Home({ darkMode, toggleTheme }) {
  const navigate = useNavigate();
  return (
    <div className={darkMode ? 'dark' : 'light'}>
      <div className="home">
        <button className='them' onClick={() => toggleTheme()}>
          {darkMode ? "☀︎" : "⏾"}
        </button>
        <img className="innovexlogo" src={logo} alt="Logo" />
        <h1>Innovex Techno</h1>
        <h2>Transforming Ideas into Reality</h2>
        <br /><br />
        <button onClick={() => navigate("/login")}>Get Started ➜</button>
      </div>
    </div>
  )
}
function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" ? true : false;
  });
  const toggleTheme = () => {
    setDarkMode(prev => {
      localStorage.setItem("darkMode", !prev);
      return !prev;
    });
  };
  return (
    <Routes>
      <Route path="/" element={<Home darkMode={darkMode} toggleTheme={toggleTheme} />} />
      <Route path="/login" element={<Login darkMode={darkMode} toggleTheme={toggleTheme} />} />
      <Route path="/signin" element={<Signin darkMode={darkMode} toggleTheme={toggleTheme} />} />
    </Routes>
  )
}

export default App
