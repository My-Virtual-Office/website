import { Routes, Route } from "react-router-dom";
// import { useEffect } from "react";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ChatPage from "./pages/Chat/ChatPage";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
// import { validateToken } from "./api/auth";

function App() {
  return (
    <Routes>
      <Route path="/">
        <Route index="true" element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
