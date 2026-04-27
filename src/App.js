import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ChatPage from "./pages/Chat/ChatPage";
import Home from "./pages/Home/Home";
function App() {
  return (
    <Routes>
      <Route path="/">
        <Route index="true" element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
        <Route path="chat" element={<ChatPage />} />
      </Route>
    </Routes>
  );
}

export default App;
